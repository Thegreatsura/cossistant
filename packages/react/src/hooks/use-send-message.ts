import type { CossistantClient } from "@cossistant/core";
import { generateMessageId } from "@cossistant/core";
import type { CreateConversationResponseBody } from "@cossistant/types/api/conversation";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useCallback, useState } from "react";

import { useSupport } from "../provider";

export type SendMessageOptions = {
	conversationId?: string | null;
	message: string;
	files?: File[];
	defaultTimelineItems?: TimelineItem[];
	visitorId?: string;
	/**
	 * Optional message ID to use for the optimistic update and API request.
	 * When not provided, a ULID will be generated on the client.
	 */
	messageId?: string;
	onSuccess?: (conversationId: string, messageId: string) => void;
	onError?: (error: Error) => void;
};

export type SendMessageResult = {
	conversationId: string;
	messageId: string;
	conversation?: CreateConversationResponseBody["conversation"];
	initialTimelineItems?: CreateConversationResponseBody["initialTimelineItems"];
};

export type UseSendMessageResult = {
	mutate: (options: SendMessageOptions) => void;
	mutateAsync: (
		options: SendMessageOptions
	) => Promise<SendMessageResult | null>;
	isPending: boolean;
	error: Error | null;
	reset: () => void;
};

export type UseSendMessageOptions = {
	client?: CossistantClient;
};

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === "string") {
		return new Error(error);
	}

	return new Error("Unknown error");
}

function buildTimelineItemPayload(
	body: string,
	conversationId: string,
	visitorId: string | null,
	messageId?: string
): TimelineItem {
	const nowIso = typeof window !== "undefined" ? new Date().toISOString() : "";
	const id = messageId ?? generateMessageId();

	return {
		id,
		conversationId,
		organizationId: "", // Will be set by backend
		type: "message" as const,
		text: body,
		parts: [{ type: "text" as const, text: body }],
		visibility: "public" as const,
		userId: null,
		aiAgentId: null,
		visitorId: visitorId ?? null,
		createdAt: nowIso,
		deletedAt: null,
	} satisfies TimelineItem;
}

/**
 * Sends visitor messages while handling optimistic pending conversations and
 * exposing react-query-like mutation state.
 */
export function useSendMessage(
	options: UseSendMessageOptions = {}
): UseSendMessageResult {
	const { client: contextClient } = useSupport();
	const client = options.client ?? contextClient;

	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const mutateAsync = useCallback(
		async (payload: SendMessageOptions): Promise<SendMessageResult | null> => {
			const {
				conversationId: providedConversationId,
				message,
				defaultTimelineItems = [],
				visitorId,
				messageId: providedMessageId,
				onSuccess,
				onError,
			} = payload;

			if (!message.trim()) {
				const emptyMessageError = new Error("Message cannot be empty");
				setError(emptyMessageError);
				onError?.(emptyMessageError);
				return null;
			}

			setIsPending(true);
			setError(null);

			try {
				let conversationId = providedConversationId ?? undefined;
				let preparedDefaultTimelineItems = defaultTimelineItems;
				let initialConversation:
					| CreateConversationResponseBody["conversation"]
					| undefined;

				if (!conversationId) {
					const initiated = client.initiateConversation({
						defaultTimelineItems,
						visitorId: visitorId ?? undefined,
					});
					conversationId = initiated.conversationId;
					preparedDefaultTimelineItems = initiated.defaultTimelineItems;
					initialConversation = initiated.conversation;
				}

				const timelineItemPayload = buildTimelineItemPayload(
					message,
					conversationId,
					visitorId ?? null,
					providedMessageId
				);

				const response = await client.sendMessage({
					conversationId,
					item: {
						id: timelineItemPayload.id,
						text: timelineItemPayload.text ?? "",
						type:
							timelineItemPayload.type === "identification"
								? "message"
								: timelineItemPayload.type,
						visibility: timelineItemPayload.visibility,
						userId: timelineItemPayload.userId,
						aiAgentId: timelineItemPayload.aiAgentId,
						visitorId: timelineItemPayload.visitorId,
						createdAt: timelineItemPayload.createdAt,
						parts: timelineItemPayload.parts,
					},
					createIfPending: true,
				});

				const messageId = response.item.id;

				if (!messageId) {
					throw new Error("SendMessage response missing item.id");
				}

				const result: SendMessageResult = {
					conversationId,
					messageId,
				};

				if ("conversation" in response && response.conversation) {
					result.conversation = response.conversation;
					result.initialTimelineItems = response.initialTimelineItems;
				} else if (initialConversation) {
					result.conversation = initialConversation;
					result.initialTimelineItems = preparedDefaultTimelineItems;
				}

				setIsPending(false);
				setError(null);
				onSuccess?.(result.conversationId, result.messageId);
				return result;
			} catch (raw) {
				const normalised = toError(raw);
				setIsPending(false);
				setError(normalised);
				onError?.(normalised);
				throw normalised;
			}
		},
		[client]
	);

	const mutate = useCallback(
		(opts: SendMessageOptions) => {
			void mutateAsync(opts).catch(() => {
				// Swallow errors to mimic react-query behaviour for mutate
			});
		},
		[mutateAsync]
	);

	const reset = useCallback(() => {
		setError(null);
		setIsPending(false);
	}, []);

	return {
		mutate,
		mutateAsync,
		isPending,
		error,
		reset,
	};
}
