import type { ConversationSeen } from "@cossistant/types/schemas";
import { useEffect, useMemo, useRef, useState } from "react";
import { hydrateConversationSeen, useSeenStore } from "../realtime/seen-store";

type UseConversationSeenOptions = {
	initialData?: ConversationSeen[];
};

function buildSeenId(
	conversationId: string,
	actorType: string,
	actorId: string
) {
	return `${conversationId}-${actorType}-${actorId}`;
}

/**
 * Reads the conversation seen store and optionally hydrates it with SSR
 * payloads.
 */
export function useConversationSeen(
	conversationId: string | null | undefined,
	options: UseConversationSeenOptions = {}
): ConversationSeen[] {
	const { initialData } = options;
	const hydratedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		// Clear hydration key when conversation changes or is unmounted
		if (!conversationId) {
			hydratedKeyRef.current = null;
			return;
		}

		// Skip if no initial data
		if (!initialData || initialData.length === 0) {
			return;
		}

		// Only hydrate once per conversation
		const hydrationKey = conversationId;

		if (hydratedKeyRef.current === hydrationKey) {
			return; // Already hydrated for this conversation
		}

		hydrateConversationSeen(conversationId, initialData);
		hydratedKeyRef.current = hydrationKey;
	}, [conversationId]); // Only depend on conversationId, NOT initialData

	const conversationSeen = useSeenStore((state) =>
		conversationId ? (state.conversations[conversationId] ?? null) : null
	);

	return useMemo(() => {
		if (!(conversationId && conversationSeen)) {
			return [];
		}

		return Object.values(conversationSeen).map(
			(entry) =>
				({
					id: buildSeenId(conversationId, entry.actorType, entry.actorId),
					conversationId,
					userId: entry.actorType === "user" ? entry.actorId : null,
					visitorId: entry.actorType === "visitor" ? entry.actorId : null,
					aiAgentId: entry.actorType === "ai_agent" ? entry.actorId : null,
					lastSeenAt: entry.lastSeenAt,
					createdAt: entry.lastSeenAt,
					updatedAt: entry.lastSeenAt,
					deletedAt: null,
				}) satisfies ConversationSeen
		);
	}, [conversationId, conversationSeen]);
}

/**
 * Debounced version of useConversationSeen that delays updates by 500ms
 * to prevent animation conflicts when messages are sent and immediately seen.
 *
 * Use this in UI components where smooth animations are critical.
 */
export function useDebouncedConversationSeen(
	conversationId: string | null | undefined,
	options: UseConversationSeenOptions = {},
	delay = 500
): ConversationSeen[] {
	const seenData = useConversationSeen(conversationId, options);
	const [debouncedSeenData, setDebouncedSeenData] =
		useState<ConversationSeen[]>(seenData);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Clear any pending timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Set new timeout to update after delay
		timeoutRef.current = setTimeout(() => {
			setDebouncedSeenData(seenData);
		}, delay);

		// Cleanup on unmount or when seenData changes
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [seenData, delay]);

	return debouncedSeenData;
}
