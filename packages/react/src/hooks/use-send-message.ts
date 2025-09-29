import type { CossistantClient } from "@cossistant/core";
import { generateMessageId } from "@cossistant/core";
import { MessageType, MessageVisibility } from "@cossistant/types";
import type { CreateConversationResponseBody } from "@cossistant/types/api/conversation";
import type { Message } from "@cossistant/types/schemas";
import { useCallback, useState } from "react";

import { useSupport } from "../provider";

export type SendMessageOptions = {
	conversationId?: string | null;
	message: string;
	files?: File[];
	defaultMessages?: Message[];
	visitorId?: string;
	onSuccess?: (conversationId: string, messageId: string) => void;
	onError?: (error: Error) => void;
};

export type SendMessageResult = {
	conversationId: string;
	messageId: string;
	conversation?: CreateConversationResponseBody["conversation"];
	initialMessages?: CreateConversationResponseBody["initialMessages"];
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

function buildMessagePayload(
	body: string,
	conversationId: string,
	visitorId?: string | null
): Message {
	const now = new Date();

	return {
		id: generateMessageId(),
		bodyMd: body,
		type: MessageType.TEXT,
		userId: null,
		aiAgentId: null,
		visitorId: visitorId ?? null,
		conversationId,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		parentMessageId: null,
		modelUsed: null,
		visibility: MessageVisibility.PUBLIC,
	} satisfies Message;
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
				defaultMessages = [],
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
				let preparedDefaultMessages = defaultMessages;
				let initialConversation:
					| CreateConversationResponseBody["conversation"]
					| undefined;

				if (!conversationId) {
					const initiated = client.initiateConversation({
						defaultMessages,
						visitorId: visitorId ?? undefined,
					});
					conversationId = initiated.conversationId;
					preparedDefaultMessages = initiated.defaultMessages;
					initialConversation = initiated.conversation;
				}

				const messagePayload = buildMessagePayload(
					message,
					conversationId,
					visitorId ?? null
				);

				const response = await client.sendMessage({
					conversationId,
					message: messagePayload,
					createIfPending: true,
				});

				const result: SendMessageResult = {
					conversationId,
					messageId: response.message.id,
				};

				if ("conversation" in response && response.conversation) {
					result.conversation = response.conversation;
					result.initialMessages = response.initialMessages;
				} else if (initialConversation) {
					result.conversation = initialConversation;
					result.initialMessages = preparedDefaultMessages;
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
