import type { CossistantClient } from "@cossistant/core";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useCallback, useEffect } from "react";
import {
	type UseMultimodalInputOptions,
	useMultimodalInput,
} from "./private/use-multimodal-input";
import { useVisitorTypingReporter } from "./private/use-visitor-typing-reporter";
import { useSendMessage } from "./use-send-message";

export type UseMessageComposerOptions = {
	/**
	 * The Cossistant client instance.
	 */
	client: CossistantClient;

	/**
	 * Current conversation ID. Can be null if no real conversation exists yet.
	 * Pass null when showing default timeline items before user sends first message.
	 */
	conversationId: string | null;

	/**
	 * Default timeline items to include when creating a new conversation.
	 */
	defaultTimelineItems?: TimelineItem[];

	/**
	 * Visitor ID to associate with messages.
	 */
	visitorId?: string;

	/**
	 * Callback when a message is successfully sent.
	 * @param conversationId - The conversation ID (may be newly created)
	 * @param messageId - The sent message ID
	 */
	onMessageSent?: (conversationId: string, messageId: string) => void;

	/**
	 * Callback when message sending fails.
	 */
	onError?: (error: Error) => void;

	/**
	 * File upload options (max size, allowed types, etc.)
	 */
	fileOptions?: Pick<
		UseMultimodalInputOptions,
		"maxFileSize" | "maxFiles" | "allowedFileTypes"
	>;
};

export type UseMessageComposerReturn = {
	// Input state
	message: string;
	files: File[];
	error: Error | null;

	// Status
	isSubmitting: boolean;
	canSubmit: boolean;

	// Actions
	setMessage: (message: string) => void;
	addFiles: (files: File[]) => void;
	removeFile: (index: number) => void;
	clearFiles: () => void;
	submit: () => void;
	reset: () => void;
};

/**
 * Combines message input, typing indicators, and message sending into
 * a single, cohesive hook for building message composers.
 *
 * This hook:
 * - Manages text input and file attachments via useMultimodalInput
 * - Sends typing indicators while user is composing
 * - Handles message submission with proper error handling
 * - Automatically resets input after successful send
 * - Works with both pending and real conversations
 *
 * @example
 * ```tsx
 * const composer = useMessageComposer({
 *   client,
 *   conversationId: realConversationId, // null if pending
 *   defaultMessages,
 *   visitorId: visitor?.id,
 *   onMessageSent: (convId) => {
 *     // Update conversation ID if it was created
 *   },
 * });
 *
 * return (
 *   <MessageInput
 *     value={composer.message}
 *     onChange={composer.setMessage}
 *     onSubmit={composer.submit}
 *     disabled={composer.isSubmitting}
 *   />
 * );
 * ```
 */
export function useMessageComposer(
	options: UseMessageComposerOptions
): UseMessageComposerReturn {
	const {
		client,
		conversationId,
		defaultTimelineItems = [],
		visitorId,
		onMessageSent,
		onError,
		fileOptions,
	} = options;

	const sendMessage = useSendMessage({ client });

	const {
		handleInputChange: reportTyping,
		handleSubmit: stopTyping,
		stop: forceStopTyping,
	} = useVisitorTypingReporter({
		client,
		conversationId,
	});

	const multimodalInput = useMultimodalInput({
		onSubmit: async ({ message: messageText, files }) => {
			// Stop typing indicator
			stopTyping();

			// Send the message
			sendMessage.mutate({
				conversationId,
				message: messageText,
				files,
				defaultTimelineItems,
				visitorId,
				onSuccess: (resultConversationId, messageId) => {
					onMessageSent?.(resultConversationId, messageId);
				},
				onError: (err) => {
					onError?.(err);
				},
			});
		},
		onError,
		...fileOptions,
	});

	// Clean up typing indicator on unmount
	useEffect(
		() => () => {
			forceStopTyping();
		},
		[forceStopTyping]
	);

	// Wrap setMessage to also report typing
	const setMessage = useCallback(
		(value: string) => {
			multimodalInput.setMessage(value);
			reportTyping(value);
		},
		[multimodalInput, reportTyping]
	);

	// Combine submission states
	const isSubmitting = multimodalInput.isSubmitting || sendMessage.isPending;
	const error = multimodalInput.error || sendMessage.error;
	const canSubmit = multimodalInput.canSubmit && !sendMessage.isPending;

	return {
		message: multimodalInput.message,
		files: multimodalInput.files,
		error,
		isSubmitting,
		canSubmit,
		setMessage,
		addFiles: multimodalInput.addFiles,
		removeFile: multimodalInput.removeFile,
		clearFiles: multimodalInput.clearFiles,
		submit: multimodalInput.submit,
		reset: multimodalInput.reset,
	};
}
