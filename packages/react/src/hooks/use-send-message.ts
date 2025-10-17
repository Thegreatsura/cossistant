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
	visitorId?: string | null
): TimelineItem {
	const nowIso = new Date().toISOString();

	return {
		id: generateMessageId(),
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
					visitorId ?? null
				);

				const response = await client.sendMessage({
					conversationId,
					item: {
						text: timelineItemPayload.text,
						type: timelineItemPayload.type,
						visibility: timelineItemPayload.visibility,
						userId: timelineItemPayload.userId,
						aiAgentId: timelineItemPayload.aiAgentId,
						visitorId: timelineItemPayload.visitorId,
						createdAt: timelineItemPayload.createdAt,
					},
					createIfPending: true,
				});

				const result: SendMessageResult = {
					conversationId,
					messageId: response.item.id || "",
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
