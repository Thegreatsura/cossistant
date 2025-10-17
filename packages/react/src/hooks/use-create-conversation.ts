import type { CossistantClient } from "@cossistant/core";
import type { CreateConversationResponseBody } from "@cossistant/types/api/conversation";
import type { Conversation, Message } from "@cossistant/types/schemas";
import { useCallback, useState } from "react";
import { useSupport } from "../provider";

export type UseCreateConversationOptions = {
  client?: CossistantClient;
  onSuccess?: (data: CreateConversationResponseBody) => void;
  onError?: (error: Error) => void;
};

export type CreateConversationVariables = {
  conversationId?: string;
  defaultMessages?: Message[];
  visitorId?: string;
  websiteId?: string | null;
  status?: Conversation["status"];
  title?: string | null;
};

export type UseCreateConversationResult = {
  mutate: (variables?: CreateConversationVariables) => void;
  mutateAsync: (
    variables?: CreateConversationVariables,
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
  options: UseCreateConversationOptions = {},
): UseCreateConversationResult {
  const { client: contextClient } = useSupport();
  const { client: overrideClient, onError, onSuccess } = options;
  const client = overrideClient ?? contextClient;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(
    async (
      variables: CreateConversationVariables = {},
    ): Promise<CreateConversationResponseBody | null> => {
      setIsPending(true);
      setError(null);

      try {
        const {
          websiteId,
          status,
          title,
          conversationId: providedConversationId,
          defaultMessages = [],
          visitorId,
        } = variables;

        const initiated = client.initiateConversation({
          conversationId: providedConversationId ?? undefined,
          defaultMessages,
          visitorId: visitorId ?? undefined,
          websiteId: websiteId ?? undefined,
          status: status ?? undefined,
          title: title ?? undefined,
        });

        const response: CreateConversationResponseBody = {
          conversation: initiated.conversation,
          initialMessages: initiated.defaultMessages,
        };

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
    [client, onError, onSuccess],
  );

  const mutate = useCallback(
    (variables?: CreateConversationVariables) => {
      void mutateAsync(variables).catch(() => {
        // Intentionally swallow to match react-query semantics
      });
    },
    [mutateAsync],
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
