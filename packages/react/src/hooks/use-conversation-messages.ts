import type { ConversationMessagesState } from "@cossistant/core";
import type {
  GetMessagesRequest,
  GetMessagesResponse,
} from "@cossistant/types/api/message";
import { useCallback, useMemo } from "react";
import { useSupport } from "../provider";
import { useStoreSelector } from "./private/store/use-store-selector";
import { useClientQuery } from "./private/use-client-query";

const EMPTY_STATE: ConversationMessagesState = {
  messages: [],
  hasNextPage: false,
  nextCursor: undefined,
};

const DEFAULT_LIMIT = 50;

const NO_CONVERSATION_ID = "__no_conversation__" as const;

export type UseConversationMessagesOptions = {
  limit?: number;
  cursor?: string | null;
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
};

export type UseConversationMessagesResult = ConversationMessagesState & {
  isLoading: boolean;
  error: Error | null;
  refetch: (
    args?: Pick<GetMessagesRequest, "cursor" | "limit">,
  ) => Promise<GetMessagesResponse | undefined>;
  fetchNextPage: () => Promise<GetMessagesResponse | undefined>;
};

export function useConversationMessages(
  conversationId: string | null | undefined,
  options: UseConversationMessagesOptions = {},
): UseConversationMessagesResult {
  const { client } = useSupport();
  const store = client.messagesStore;

  if (!store) {
    throw new Error("Messages store is not available on the client instance");
  }

  const stableConversationId = conversationId ?? NO_CONVERSATION_ID;

  const selection = useStoreSelector(store, (state) => {
    return state.conversations[stableConversationId] ?? EMPTY_STATE;
  });

  const baseArgs = useMemo(() => {
    return {
      limit: options.limit ?? DEFAULT_LIMIT,
      cursor: options.cursor ?? undefined,
    } satisfies Pick<GetMessagesRequest, "limit" | "cursor">;
  }, [options.cursor, options.limit]);

  const {
    refetch: queryRefetch,
    isLoading: queryLoading,
    error,
  } = useClientQuery<
    GetMessagesResponse,
    Pick<GetMessagesRequest, "cursor" | "limit">
  >({
    client,
    queryFn: (instance, args) => {
      if (!conversationId) {
        return Promise.resolve({
          messages: [],
          hasNextPage: false,
          nextCursor: undefined,
        });
      }

      return instance.getConversationMessages({
        conversationId,
        limit: args?.limit ?? baseArgs.limit,
        cursor: args?.cursor ?? baseArgs.cursor,
      });
    },
    enabled: Boolean(conversationId) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnMount: selection.messages.length === 0,
    initialArgs: baseArgs,
    dependencies: [
      stableConversationId,
      baseArgs.limit,
      baseArgs.cursor ?? null,
    ],
  });

  const refetch = useCallback(
    (args?: Pick<GetMessagesRequest, "cursor" | "limit">) => {
      if (!conversationId) {
        return Promise.resolve(undefined);
      }

      return queryRefetch({
        limit: baseArgs.limit,
        cursor: baseArgs.cursor,
        ...args,
      });
    },
    [queryRefetch, baseArgs, conversationId],
  );

  const fetchNextPage = useCallback(() => {
    if (!(selection.hasNextPage && selection.nextCursor)) {
      return Promise.resolve(undefined);
    }

    return refetch({ cursor: selection.nextCursor });
  }, [selection.hasNextPage, selection.nextCursor, refetch]);

  const isInitialLoad = selection.messages.length === 0;
  const isLoading = isInitialLoad ? queryLoading : false;

  return {
    messages: selection.messages,
    hasNextPage: selection.hasNextPage,
    nextCursor: selection.nextCursor,
    isLoading,
    error,
    refetch,
    fetchNextPage,
  };
}
