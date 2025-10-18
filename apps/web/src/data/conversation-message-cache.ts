import type { RouterOutputs } from "@api/trpc/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type ConversationTimelineItemsPage =
  RouterOutputs["conversation"]["getConversationTimelineItems"];
export type ConversationTimelineItem =
  ConversationTimelineItemsPage["items"][number];

function sortTimelineItemsByCreatedAt(
  items: ConversationTimelineItem[]
): ConversationTimelineItem[] {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function initializeInfiniteData(
  item: ConversationTimelineItem,
  existing?: InfiniteData<ConversationTimelineItemsPage>
): InfiniteData<ConversationTimelineItemsPage> {
  const firstPageParam =
    existing && existing.pageParams.length > 0 ? existing.pageParams[0] : null;

  return {
    pages: [
      {
        items: [item],
        nextCursor: null,
        hasNextPage: false,
      },
    ],
    pageParams: [firstPageParam],
  };
}

function upsertTimelineItemInInfiniteData(
  existing: InfiniteData<ConversationTimelineItemsPage> | undefined,
  item: ConversationTimelineItem
): InfiniteData<ConversationTimelineItemsPage> {
  if (!existing || existing.pages.length === 0) {
    return initializeInfiniteData(item, existing);
  }

  let itemExists = false;

  const pages = existing.pages.map((page, pageIndex) => {
    const currentItems = [...page.items];
    const existingIndex = currentItems.findIndex(
      (existingItem) => existingItem.id === item.id
    );

    if (existingIndex !== -1) {
      itemExists = true;
      currentItems[existingIndex] = item;
      return {
        ...page,
        items: sortTimelineItemsByCreatedAt(currentItems),
      };
    }

    if (!itemExists && pageIndex === existing.pages.length - 1) {
      return {
        ...page,
        items: sortTimelineItemsByCreatedAt([...currentItems, item]),
      };
    }

    return page;
  });

  return {
    pages,
    pageParams: [...existing.pageParams],
  };
}

function removeTimelineItemFromInfiniteData(
  existing: InfiniteData<ConversationTimelineItemsPage> | undefined,
  itemId: string
): InfiniteData<ConversationTimelineItemsPage> | undefined {
  if (!existing) {
    return existing;
  }

  let removed = false;

  const pages = existing.pages.map((page) => {
    const filtered = page.items.filter((item) => item.id !== itemId);
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

export function createConversationTimelineItemsInfiniteQueryKey(
  baseQueryKey: readonly unknown[]
) {
  return [...baseQueryKey, { type: "infinite" }] as const;
}

export function upsertConversationTimelineItemInCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  item: ConversationTimelineItem
) {
  queryClient.setQueryData<InfiniteData<ConversationTimelineItemsPage>>(
    queryKey,
    (existing) => upsertTimelineItemInInfiniteData(existing, item)
  );
}

export function removeConversationTimelineItemFromCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  itemId: string
) {
  queryClient.setQueryData<
    InfiniteData<ConversationTimelineItemsPage> | undefined
  >(queryKey, (existing) =>
    removeTimelineItemFromInfiniteData(existing, itemId)
  );
}

// Backward compatible aliases (deprecated - use timeline item functions instead)
export const createConversationMessagesInfiniteQueryKey =
  createConversationTimelineItemsInfiniteQueryKey;
export const upsertConversationMessageInCache =
  upsertConversationTimelineItemInCache;
export const removeConversationMessageFromCache =
  removeConversationTimelineItemFromCache;
export type ConversationMessagesPage = ConversationTimelineItemsPage;
export type ConversationMessage = ConversationTimelineItem;
