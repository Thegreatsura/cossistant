import type {
  GetConversationRequest,
  GetConversationResponse,
} from "@cossistant/types/api/conversation";
import { useStoreSelector } from "../../hooks/private/store/use-store-selector";
import { useClientQuery } from "../../hooks/private/use-client-query";
import { useSupport } from "../../provider";

export type UseConversationOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
};

export type UseConversationResult = {
  conversation: GetConversationResponse["conversation"] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: (
    args?: GetConversationRequest
  ) => Promise<GetConversationResponse | undefined>;
};

export function useConversation(
  conversationId: string | null,
  options: UseConversationOptions = {}
): UseConversationResult {
  const { client } = useSupport();
  const store = client.conversationsStore;

  const conversation = useStoreSelector(store, (state) => {
    if (!conversationId) {
      return null;
    }
    return state.byId[conversationId] ?? null;
  });

  const request: GetConversationRequest | undefined = conversationId
    ? { conversationId }
    : undefined;

  const {
    refetch: queryRefetch,
    isLoading: queryLoading,
    error,
  } = useClientQuery<GetConversationResponse, GetConversationRequest>({
    client,
    queryFn: (instance) => {
      if (!request) {
        throw new Error("Conversation ID is required");
      }
      return instance.getConversation(request);
    },
    enabled: Boolean(conversationId && (options.enabled ?? true)),
    refetchInterval: options.refetchInterval ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnMount: !conversation,
    initialArgs: request,
    dependencies: [conversationId ?? "null"],
  });

  const refetch = (args?: GetConversationRequest) => {
    if (!conversationId) {
      return Promise.resolve(undefined);
    }

    return queryRefetch({
      conversationId,
      ...args,
    });
  };

  const isLoading = conversation ? false : queryLoading;

  return {
    conversation,
    isLoading,
    error,
    refetch,
  };
}
