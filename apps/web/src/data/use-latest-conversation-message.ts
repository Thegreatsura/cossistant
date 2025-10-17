"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useTRPC } from "@/lib/trpc/client";
import {
  type ConversationMessagesPage,
  createConversationMessagesInfiniteQueryKey,
} from "./conversation-message-cache";

type LastMessagePreview = ConversationHeader["lastMessagePreview"];

type UseLatestConversationMessageOptions = {
  conversationId: string;
  websiteSlug: string;
  limit?: number;
};

function findLatestMessage(
  data: InfiniteData<ConversationMessagesPage> | undefined,
): LastMessagePreview {
  if (!data) {
    return null;
  }

  for (let pageIndex = data.pages.length - 1; pageIndex >= 0; pageIndex--) {
    const page = data.pages[pageIndex];
    const lastMessage = page.items.at(-1);

    if (lastMessage) {
      return lastMessage as LastMessagePreview;
    }
  }

  return null;
}

export function useLatestConversationMessage({
  conversationId,
  websiteSlug,
  limit = 50,
}: UseLatestConversationMessageOptions): LastMessagePreview {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const baseQueryKey = useMemo(
    () =>
      trpc.conversation.getConversationMessages.queryOptions({
        websiteSlug,
        conversationId,
        limit,
      }).queryKey,
    [conversationId, limit, trpc, websiteSlug],
  );

  const queryKey = useMemo(
    () => createConversationMessagesInfiniteQueryKey(baseQueryKey),
    [baseQueryKey],
  );

  const getSnapshot = useCallback(() => {
    const data =
      queryClient.getQueryData<InfiniteData<ConversationMessagesPage>>(
        queryKey,
      );

    return findLatestMessage(data);
  }, [queryClient, queryKey]);

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      queryClient.getQueryCache().subscribe(() => {
        onStoreChange();
      }),
    [queryClient],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
