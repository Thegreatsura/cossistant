import type { CossistantClient } from "@cossistant/core";
import type {
	CreateConversationRequestBody,
	CreateConversationResponseBody,
} from "@cossistant/types/api/conversation";
import { useCallback, useState } from "react";

import { useSupport } from "../provider";

export type UseCreateConversationOptions = {
	client?: CossistantClient;
	onSuccess?: (data: CreateConversationResponseBody) => void;
	onError?: (error: Error) => void;
};

export type CreateConversationVariables =
	Partial<CreateConversationRequestBody>;

export type UseCreateConversationResult = {
	mutate: (variables?: CreateConversationVariables) => void;
	mutateAsync: (
		variables?: CreateConversationVariables
	) => Promise<CreateConversationResponseBody | null>;
	isPending: boolean;
	error: Error | null;
	reset: () => void;
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

export function useCreateConversation(
	options: UseCreateConversationOptions = {}
): UseCreateConversationResult {
	const { client: contextClient } = useSupport();
	const { client: overrideClient, onError, onSuccess } = options;
	const client = overrideClient ?? contextClient;

	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const mutateAsync = useCallback(
		async (
			variables: CreateConversationVariables = {}
		): Promise<CreateConversationResponseBody | null> => {
			setIsPending(true);
			setError(null);

			try {
				const {
					conversationId: providedConversationId,
					defaultMessages = [],
					...rest
				} = variables;

				const { visitorId: resolvedVisitorId, websiteId, status, title } = rest;

				const { conversationId, defaultMessages: preparedMessages } =
					client.initiateConversation({
						conversationId: providedConversationId ?? undefined,
						defaultMessages,
						visitorId: resolvedVisitorId ?? undefined,
						websiteId: websiteId ?? undefined,
						status: status ?? undefined,
						title: title ?? undefined,
					});

				const response = await client.createConversation({
					...rest,
					conversationId,
					defaultMessages: preparedMessages,
				});

				setIsPending(false);
				setError(null);
				onSuccess?.(response);
				return response;
			} catch (raw) {
				const normalised = toError(raw);
				setIsPending(false);
				setError(normalised);
				onError?.(normalised);
				throw normalised;
			}
		},
		[client, onError, onSuccess]
	);

	const mutate = useCallback(
		(variables?: CreateConversationVariables) => {
			void mutateAsync(variables).catch(() => {
				// Intentionally swallow to match react-query semantics
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
