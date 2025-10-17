import type { ConversationEvent, Message } from "@cossistant/types";
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
	 * Optional messages to pass through (e.g., optimistic updates).
	 */
	messages?: Message[];

	/**
	 * Optional events to pass through.
	 */
	events?: ConversationEvent[];
};

export type UseConversationPageReturn = {
	// Conversation state
	conversationId: string;
	isPending: boolean;
	messages: Message[];
	events: ConversationEvent[];
	items: TimelineItem[]; // New: unified timeline items
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
	hasMessages: boolean;
	lastMessage: Message | null;
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
		messages: passedMessages = [],
		events: passedEvents = [],
	} = options;

	const { client, visitor } = useSupport();

	const trimmedInitialMessage = initialMessage?.trim() ?? "";
	const hasInitialMessage = trimmedInitialMessage.length > 0;

	// 1. Manage conversation lifecycle (pending vs real)
	const lifecycle = useConversationLifecycle({
		initialConversationId,
		onConversationCreated: onConversationIdChange,
	});

	// 2. Get default messages for pending state
	const defaultMessages = useDefaultMessages({
		conversationId: lifecycle.conversationId,
	});

	const effectiveDefaultMessages = hasInitialMessage ? [] : defaultMessages;

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

		// If pending, convert default messages to timeline items
		if (lifecycle.isPending && effectiveDefaultMessages.length > 0) {
			return effectiveDefaultMessages.map((msg) => ({
				id: msg.id,
				conversationId: lifecycle.conversationId,
				organizationId: "", // Not available for default messages
				visibility: msg.visibility,
				type: "message" as const,
				text: msg.bodyMd,
				parts: [{ type: "text" as const, text: msg.bodyMd }],
				userId: msg.userId,
				visitorId: msg.visitorId,
				aiAgentId: msg.aiAgentId,
				createdAt: msg.createdAt,
				deletedAt: msg.deletedAt,
			}));
		}

		// Fallback to empty
		return [];
	}, [
		timelineQuery.items,
		lifecycle.isPending,
		lifecycle.conversationId,
		effectiveDefaultMessages,
	]);

	// Extract messages and events from timeline items for backward compatibility
	const displayMessages = useMemo(() => {
		return displayItems
			.filter((item) => item.type === "message")
			.map((item) => ({
				id: item.id || "",
				bodyMd: item.text || "",
				type: "text" as const,
				userId: item.userId,
				visitorId: item.visitorId,
				aiAgentId: item.aiAgentId,
				conversationId: item.conversationId,
				organizationId: item.organizationId,
				websiteId: "", // Not available in timeline item
				parentMessageId: null,
				modelUsed: null,
				visibility: item.visibility,
				createdAt: item.createdAt,
				updatedAt: item.createdAt,
				deletedAt: item.deletedAt,
			})) as Message[];
	}, [displayItems]);

	const displayEvents = useMemo(() => {
		// Events are embedded in timeline items, extract them
		// This is a fallback for legacy components
		return [] as ConversationEvent[];
	}, []);

	const lastMessage = useMemo(
		() => displayMessages.at(-1) ?? null,
		[displayMessages]
	);

	// 5. Set up message composer
	const composer = useMessageComposer({
		client,
		conversationId: lifecycle.realConversationId,
		defaultMessages: effectiveDefaultMessages,
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
		lastMessage,
	});

	return {
		conversationId: lifecycle.conversationId,
		isPending: lifecycle.isPending,
		messages: displayMessages,
		events: displayEvents,
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
		hasMessages: displayMessages.length > 0,
		lastMessage,
	};
}
