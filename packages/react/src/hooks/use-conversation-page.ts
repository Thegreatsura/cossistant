import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useEffect, useMemo, useRef } from "react";
import { useSupport } from "../provider";
import { useDefaultMessages } from "./private/use-default-messages";
import { useConversationAutoSeen } from "./use-conversation-auto-seen";
import { useConversationLifecycle } from "./use-conversation-lifecycle";
import { useConversationTimelineItems } from "./use-conversation-timeline-items";
import { useMessageComposer } from "./use-message-composer";

export type UseConversationPageOptions = {
        /**
         * Initial conversation ID (from URL params, navigation state, etc.)
         * Can be PENDING_CONVERSATION_ID or a real ID.
         */
        conversationId: string;

	/**
	 * Optional initial message to send when the conversation opens.
	 */
	initialMessage?: string;

	/**
	 * Callback when conversation ID changes (e.g., after creation).
	 * Use this to update navigation state or URL.
	 */
	onConversationIdChange?: (conversationId: string) => void;

        /**
         * Optional timeline items to pass through (e.g., optimistic updates).
         */
        items?: TimelineItem[];

        /**
         * Whether automatic "seen" tracking should be enabled.
         * Set to false when the conversation isn't visible (e.g. widget closed).
         * Default: true
         */
        autoSeenEnabled?: boolean;
};

export type UseConversationPageReturn = {
	// Conversation state
	conversationId: string;
	isPending: boolean;
	items: TimelineItem[];
	isLoading: boolean;
	error: Error | null;

	// Message composer
	composer: {
		message: string;
		files: File[];
		isSubmitting: boolean;
		canSubmit: boolean;
		setMessage: (message: string) => void;
		addFiles: (files: File[]) => void;
		removeFile: (index: number) => void;
		submit: () => void;
	};

	// UI helpers
	hasItems: boolean;
	lastTimelineItem: TimelineItem | null;
};

/**
 * Main orchestrator hook for the conversation page.
 *
 * This hook combines all conversation-related logic:
 * - Lifecycle management (pending → real conversation)
 * - Message fetching and display
 * - Message composition and sending
 * - Automatic seen tracking
 * - Default/welcome messages before conversation is created
 *
 * It provides a clean, simple API for building conversation UIs.
 *
 * @example
 * ```tsx
 * export function ConversationPage({ conversationId: initialId }) {
 *   const conversation = useConversationPage({
 *     conversationId: initialId,
 *     onConversationIdChange: (newId) => {
 *       // Update URL or navigation state
 *       navigate(`/conversation/${newId}`);
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <MessageList messages={conversation.messages} />
 *       <MessageInput
 *         value={conversation.composer.message}
 *         onChange={conversation.composer.setMessage}
 *         onSubmit={conversation.composer.submit}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useConversationPage(
        options: UseConversationPageOptions
): UseConversationPageReturn {
        const {
                conversationId: initialConversationId,
                initialMessage,
                onConversationIdChange,
                items: passedItems = [],
                autoSeenEnabled = true,
        } = options;

	const { client, visitor } = useSupport();

	const trimmedInitialMessage = initialMessage?.trim() ?? "";
	const hasInitialMessage = trimmedInitialMessage.length > 0;

	// 1. Manage conversation lifecycle (pending vs real)
	const lifecycle = useConversationLifecycle({
		initialConversationId,
		onConversationCreated: onConversationIdChange,
	});

	// 2. Get default timeline items for pending state
	const defaultTimelineItems = useDefaultMessages({
		conversationId: lifecycle.conversationId,
	});

	const effectiveDefaultTimelineItems = hasInitialMessage
		? []
		: defaultTimelineItems;

	// 3. Fetch timeline items from backend if real conversation exists
	const timelineQuery = useConversationTimelineItems(lifecycle.conversationId, {
		enabled: !lifecycle.isPending,
	});

	// 4. Determine which items to display
	const displayItems = useMemo(() => {
		// If we have fetched timeline items, use them
		if (timelineQuery.items.length > 0) {
			return timelineQuery.items;
		}

		// If pending, use default timeline items
		if (lifecycle.isPending && effectiveDefaultTimelineItems.length > 0) {
			return effectiveDefaultTimelineItems;
		}

		// Use passed items as fallback
		if (passedItems.length > 0) {
			return passedItems;
		}

		return [];
	}, [
		timelineQuery.items,
		lifecycle.isPending,
		effectiveDefaultTimelineItems,
		passedItems,
	]);

	const lastTimelineItem = useMemo(
		() => displayItems.at(-1) ?? null,
		[displayItems]
	);

	// 5. Set up message composer
	const composer = useMessageComposer({
		client,
		conversationId: lifecycle.realConversationId,
		defaultTimelineItems: effectiveDefaultTimelineItems,
		visitorId: visitor?.id,
		onMessageSent: (newConversationId) => {
			// Transition from pending to real conversation
			if (lifecycle.isPending) {
				lifecycle.setConversationId(newConversationId);
			}
		},
	});

	const initialMessageSubmittedRef = useRef(false);
	const lastInitialMessageRef = useRef<string | null>(null);

	useEffect(() => {
		if (!hasInitialMessage) {
			initialMessageSubmittedRef.current = false;
			lastInitialMessageRef.current = null;
			return;
		}

		if (lastInitialMessageRef.current !== trimmedInitialMessage) {
			initialMessageSubmittedRef.current = false;
			lastInitialMessageRef.current = trimmedInitialMessage;
		}

		if (!lifecycle.isPending) {
			return;
		}

		if (composer.message !== trimmedInitialMessage) {
			composer.setMessage(trimmedInitialMessage);
			return;
		}

		if (
			initialMessageSubmittedRef.current ||
			composer.isSubmitting ||
			!composer.canSubmit
		) {
			return;
		}

		initialMessageSubmittedRef.current = true;
		composer.submit();
	}, [
		hasInitialMessage,
		lifecycle.isPending,
		composer.message,
		composer.setMessage,
		composer.isSubmitting,
		composer.canSubmit,
		composer.submit,
		trimmedInitialMessage,
	]);

	// 6. Auto-mark messages as seen
        useConversationAutoSeen({
                client,
                conversationId: lifecycle.realConversationId,
                visitorId: visitor?.id,
                lastTimelineItem,
                enabled: autoSeenEnabled,
        });

	return {
		conversationId: lifecycle.conversationId,
		isPending: lifecycle.isPending,
		items: displayItems,
		isLoading: timelineQuery.isLoading,
		error: timelineQuery.error || composer.error,
		composer: {
			message: composer.message,
			files: composer.files,
			isSubmitting: composer.isSubmitting,
			canSubmit: composer.canSubmit,
			setMessage: composer.setMessage,
			addFiles: composer.addFiles,
			removeFile: composer.removeFile,
			submit: composer.submit,
		},
		hasItems: displayItems.length > 0,
		lastTimelineItem,
	};
}
