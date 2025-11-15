import type { CossistantClient } from "@cossistant/core";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useEffect, useRef } from "react";
import {
	hydrateConversationSeen,
	upsertConversationSeen,
} from "../realtime/seen-store";
import { useWindowVisibilityFocus } from "./use-window-visibility-focus";

export const CONVERSATION_AUTO_SEEN_DELAY_MS = 2000;

export type UseConversationAutoSeenOptions = {
	/**
	 * The Cossistant client instance.
	 */
	client: CossistantClient | null;

	/**
	 * The real conversation ID. Pass null if no conversation exists yet.
	 */
	conversationId: string | null;

	/**
	 * Current visitor ID.
	 */
	visitorId?: string;

	/**
	 * The last timeline item in the conversation.
	 * Used to determine if we should mark as seen.
	 */
	lastTimelineItem: TimelineItem | null;

	/**
	 * Whether to enable auto-seen tracking.
	 * Default: true
	 */
	enabled?: boolean;

	/**
	 * Whether the support widget is currently open/visible.
	 * This is required to ensure we only mark conversations as seen when
	 * the widget is actually visible to the user.
	 * Default: true
	 */
	isWidgetOpen?: boolean;
};

/**
 * Automatically marks timeline items as seen when:
 * - A new timeline item arrives from someone else
 * - The page is visible/focused
 * - The support widget is open/visible
 * - The visitor is the current user
 *
 * Also handles:
 * - Fetching and hydrating initial seen data
 * - Preventing duplicate API calls
 * - Page visibility tracking
 * - Widget visibility tracking
 *
 * @example
 * ```tsx
 * useConversationAutoSeen({
 *   client,
 *   conversationId: realConversationId,
 *   visitorId: visitor?.id,
 *   lastTimelineItem: items[items.length - 1] ?? null,
 * });
 * ```
 */
export function useConversationAutoSeen(
	options: UseConversationAutoSeenOptions
): void {
	const {
		client,
		conversationId,
		visitorId,
		lastTimelineItem,
		enabled = true,
		isWidgetOpen = true,
	} = options;

	const lastSeenItemIdRef = useRef<string | null>(null);
	const markSeenInFlightRef = useRef(false);
	const markSeenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { isPageVisible, hasWindowFocus } = useWindowVisibilityFocus();
	const latestStateRef = useRef({
		enabled,
		isWidgetOpen,
		isPageVisible,
		hasWindowFocus,
	});

	useEffect(() => {
		latestStateRef.current = {
			enabled,
			isWidgetOpen,
			isPageVisible,
			hasWindowFocus,
		};
	}, [enabled, isWidgetOpen, hasWindowFocus, isPageVisible]);

	// Reset seen tracking when conversation changes
	useEffect(() => {
		lastSeenItemIdRef.current = null;
		markSeenInFlightRef.current = false;
		if (markSeenTimeoutRef.current) {
			clearTimeout(markSeenTimeoutRef.current);
			markSeenTimeoutRef.current = null;
		}
	}, [conversationId]);

	// Clear timeout immediately when widget closes and reset tracking
	useEffect(() => {
		if (!isWidgetOpen) {
			if (markSeenTimeoutRef.current) {
				clearTimeout(markSeenTimeoutRef.current);
				markSeenTimeoutRef.current = null;
			}
			markSeenInFlightRef.current = false;
			// Reset last seen item ID so we don't skip marking when widget reopens
			// This ensures we check again when the widget is reopened
			lastSeenItemIdRef.current = null;
		}
	}, [isWidgetOpen]);

	// Fetch and hydrate initial seen data when conversation loads
	useEffect(() => {
		if (enabled && client && conversationId) {
			void client
				.getConversationSeenData({ conversationId })
				.then((response) => {
					if (response.seenData.length > 0) {
						hydrateConversationSeen(conversationId, response.seenData);
					}
				})
				.catch((err) => {
					console.error("Failed to fetch conversation seen data:", err);
				});
		}
	}, [enabled, client, conversationId]);

	// Auto-mark timeline items as seen
	useEffect(() => {
		// Early return if widget is closed - don't process any seen updates
		if (!(isWidgetOpen && enabled)) {
			if (markSeenTimeoutRef.current) {
				clearTimeout(markSeenTimeoutRef.current);
				markSeenTimeoutRef.current = null;
			}
			return;
		}

		if (markSeenTimeoutRef.current) {
			clearTimeout(markSeenTimeoutRef.current);
			markSeenTimeoutRef.current = null;
		}

		const shouldMark =
			client &&
			conversationId &&
			visitorId &&
			lastTimelineItem &&
			isPageVisible &&
			hasWindowFocus;

		if (!shouldMark) {
			return;
		}

		// Don't mark our own timeline items as seen via API (we already know we saw them)
		if (lastTimelineItem.visitorId === visitorId) {
			lastSeenItemIdRef.current = lastTimelineItem.id || null;
			return;
		}

		// Already marked this item
		if (lastSeenItemIdRef.current === lastTimelineItem.id) {
			return;
		}

		// Already in flight
		if (markSeenInFlightRef.current) {
			return;
		}

		const pendingItemId = lastTimelineItem.id || null;

		markSeenTimeoutRef.current = setTimeout(() => {
			const {
				enabled: latestEnabled,
				isWidgetOpen: latestIsWidgetOpen,
				isPageVisible: latestPageVisible,
				hasWindowFocus: latestHasFocus,
			} = latestStateRef.current;

			if (
				!(
					client &&
					conversationId &&
					latestEnabled &&
					latestIsWidgetOpen &&
					latestPageVisible &&
					latestHasFocus
				)
			) {
				markSeenInFlightRef.current = false;
				markSeenTimeoutRef.current = null;
				return;
			}

			// Check if conversation timeline is scrolled near bottom
			const timelineElement =
				typeof document !== "undefined"
					? document.getElementById("conversation-timeline")
					: null;
			const isNearBottom = timelineElement
				? timelineElement.scrollHeight -
						timelineElement.scrollTop -
						timelineElement.clientHeight <=
					32
				: true; // Default to true if element not found (SSR or unmounted)

			if (!isNearBottom) {
				markSeenInFlightRef.current = false;
				markSeenTimeoutRef.current = null;
				return;
			}

			markSeenInFlightRef.current = true;

			client
				.markConversationSeen({ conversationId })
				.then((response) => {
					lastSeenItemIdRef.current = pendingItemId;

					// Optimistically update local seen store
					upsertConversationSeen({
						conversationId,
						actorType: "visitor",
						actorId: visitorId,
						lastSeenAt: new Date(response.lastSeenAt),
					});
				})
				.catch((err) => {
					console.error("Failed to mark conversation as seen:", err);
				})
				.finally(() => {
					markSeenInFlightRef.current = false;
					markSeenTimeoutRef.current = null;
				});
		}, CONVERSATION_AUTO_SEEN_DELAY_MS);

		return () => {
			if (markSeenTimeoutRef.current) {
				clearTimeout(markSeenTimeoutRef.current);
				markSeenTimeoutRef.current = null;
			}
		};
	}, [
		enabled,
		isWidgetOpen,
		client,
		conversationId,
		visitorId,
		lastTimelineItem,
		isPageVisible,
		hasWindowFocus,
	]);
}
