import type { Message } from "@cossistant/types";
import type { InfiniteData } from "@tanstack/react-query";

// Type for the paginated response
export type PaginatedMessagesResponse = {
  messages: Message[];
  nextCursor?: string;
  hasNextPage: boolean;
};

// Type for the infinite query cache structure
export type PaginatedMessagesCache = InfiniteData<PaginatedMessagesResponse>;

/**
 * Sort messages by creation date (oldest first)
 */
function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
}

/**
 * Initialize infinite data structure with a single message
 */
function initializeInfiniteData(
  message: Message,
  existing?: PaginatedMessagesCache
): PaginatedMessagesCache {
  const firstPageParam =
    existing && existing.pageParams.length > 0
      ? existing.pageParams[0]
      : undefined;

  return {
    pages: [
      {
        messages: [message],
        nextCursor: undefined,
        hasNextPage: false,
      },
    ],
    pageParams: [firstPageParam],
  };
}

/**
 * Upsert a message into the paginated cache
 * - Updates existing message if found
 * - Adds new message to the first page if not found
 */
export function upsertMessageInCache(
  existing: PaginatedMessagesCache | undefined,
  message: Message
): PaginatedMessagesCache {
  console.log("[upsertMessageInCache] Called with:", {
    hasExisting: !!existing,
    pagesCount: existing?.pages?.length,
    messageId: message.id,
  });

  // Initialize cache if it doesn't exist
  if (!existing || existing.pages.length === 0) {
    console.log("[upsertMessageInCache] Initializing new cache");
    return initializeInfiniteData(message, existing);
  }

  let messageExists = false;

  // First pass: check if message exists and update it
  const pages = existing.pages.map((page) => {
    const currentMessages = [...page.messages];
    const existingIndex = currentMessages.findIndex(
      (msg) => msg.id === message.id
    );

    if (existingIndex !== -1) {
      messageExists = true;
      currentMessages[existingIndex] = message;
      return {
        ...page,
        messages: sortMessagesByCreatedAt(currentMessages),
      };
    }

    return page;
  });

  // If message doesn't exist, add it to the first page (most recent)
  if (!messageExists && pages.length > 0 && pages[0]) {
    const firstPage = pages[0];
    pages[0] = {
      ...firstPage,
      messages: sortMessagesByCreatedAt([...firstPage.messages, message]),
      hasNextPage: firstPage.hasNextPage,
    };
  }

  return {
    pages,
    pageParams: [...existing.pageParams],
  };
}

/**
 * Remove a message from the paginated cache
 */
export function removeMessageFromCache(
  existing: PaginatedMessagesCache | undefined,
  messageId: string
): PaginatedMessagesCache | undefined {
  if (!existing) {
    return existing;
  }

  let removed = false;

  const pages = existing.pages.map((page) => {
    const filtered = page.messages.filter((msg) => msg.id !== messageId);
    if (filtered.length !== page.messages.length) {
      removed = true;
      return {
        ...page,
        messages: filtered,
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

/**
 * Set initial messages in the cache
 * Creates a single page with all the messages
 */
export function setMessagesInCache(
  messages: Message[]
): PaginatedMessagesCache {
  return {
    pages: [
      {
        messages: sortMessagesByCreatedAt(messages),
        nextCursor: undefined,
        hasNextPage: false,
      },
    ],
    pageParams: [undefined],
  };
}

/**
 * Alias for setMessagesInCache for backward compatibility
 */
export const setInitialMessagesInCache = setMessagesInCache;

/**
 * Get all messages from the paginated cache
 */
export function getAllMessagesFromCache(
  cache: PaginatedMessagesCache | undefined
): Message[] {
  if (!cache?.pages) {
    return [];
  }
  return cache.pages.flatMap((page) => page.messages);
}
