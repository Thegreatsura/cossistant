import type { RouterOutputs } from "@api/trpc/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type ConversationMessagesPage =
  RouterOutputs["conversation"]["getConversationMessages"];
export type ConversationMessage = ConversationMessagesPage["items"][number];

function sortMessagesByCreatedAt(
  messages: ConversationMessage[],
): ConversationMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function initializeInfiniteData(
  message: ConversationMessage,
  existing?: InfiniteData<ConversationMessagesPage>,
): InfiniteData<ConversationMessagesPage> {
  const firstPageParam =
    existing && existing.pageParams.length > 0 ? existing.pageParams[0] : null;

  return {
    pages: [
      {
        items: [message],
        nextCursor: null,
        hasNextPage: false,
      },
    ],
    pageParams: [firstPageParam],
  };
}

function upsertMessageInInfiniteData(
  existing: InfiniteData<ConversationMessagesPage> | undefined,
  message: ConversationMessage,
): InfiniteData<ConversationMessagesPage> {
  if (!existing || existing.pages.length === 0) {
    return initializeInfiniteData(message, existing);
  }

  let messageExists = false;

  const pages = existing.pages.map((page, pageIndex) => {
    const currentItems = [...page.items];
    const existingIndex = currentItems.findIndex(
      (item) => item.id === message.id,
    );

    if (existingIndex !== -1) {
      messageExists = true;
      currentItems[existingIndex] = message;
      return {
        ...page,
        items: sortMessagesByCreatedAt(currentItems),
      };
    }

    if (!messageExists && pageIndex === existing.pages.length - 1) {
      return {
        ...page,
        items: sortMessagesByCreatedAt([...currentItems, message]),
      };
    }

    return page;
  });

  return {
    pages,
    pageParams: [...existing.pageParams],
  };
}

function removeMessageFromInfiniteData(
  existing: InfiniteData<ConversationMessagesPage> | undefined,
  messageId: string,
): InfiniteData<ConversationMessagesPage> | undefined {
  if (!existing) {
    return existing;
  }

  let removed = false;

  const pages = existing.pages.map((page) => {
    const filtered = page.items.filter((item) => item.id !== messageId);
    if (filtered.length !== page.items.length) {
      removed = true;
      return {
        ...page,
        items: filtered,
      };
    }

    return page;
  });

  if (!removed) {
    return existing;
  }

  return {
    pages,
    pageParams: [...existing.pageParams],
  };
}

export function createConversationMessagesInfiniteQueryKey(
  baseQueryKey: readonly unknown[],
) {
  return [...baseQueryKey, { type: "infinite" }] as const;
}

export function upsertConversationMessageInCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  message: ConversationMessage,
) {
  queryClient.setQueryData<InfiniteData<ConversationMessagesPage>>(
    queryKey,
    (existing) => upsertMessageInInfiniteData(existing, message),
  );
}

export function removeConversationMessageFromCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  messageId: string,
) {
  queryClient.setQueryData<InfiniteData<ConversationMessagesPage> | undefined>(
    queryKey,
    (existing) => removeMessageFromInfiniteData(existing, messageId),
  );
}
