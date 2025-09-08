/**
 * Batch fetching utilities for sync operations
 */

import type {
  SyncConversation,
  SyncMessage,
  SyncResponse,
} from "@cossistant/types";
import type { QueryClient } from "@tanstack/react-query";
import { saveConversations, saveMessages } from "../db";
import { setSyncCursor } from "./cursor";

export interface BatchFetchParams {
  websiteId: string;
  cursor: string | null;
  limit: number;
  page: number;
}

export interface BatchFetchResult {
  conversations: SyncConversation[];
  messages: SyncMessage[];
  cursor: string | null;
  hasMore: boolean;
  nextPage: number | null;
}

export interface SyncLoopResult {
  conversations: SyncConversation[];
  messages: SyncMessage[];
}

export interface SyncLoopConfig {
  maxPages?: number;
  batchDelay?: number;
  progressCallback?: (progress: number) => void;
}

const DEFAULT_CONFIG: Required<SyncLoopConfig> = {
  maxPages: 100,
  batchDelay: 100,
  progressCallback: () => {},
};

/**
 * Creates a batch fetcher function
 */
export function createBatchFetcher<
  T extends {
    sync: {
      sync: {
        queryOptions: (params: {
          websiteId: string;
          cursor: string | null;
          limit: number;
          page: number;
        }) => unknown;
      };
    };
  },
>(queryClient: QueryClient, trpc: T, websiteId: string) {
  return async (cursor: string | null, page: number): Promise<SyncResponse> => {
    const queryOptions = trpc.sync.sync.queryOptions({
      websiteId,
      cursor,
      limit: 100,
      page,
    });

    return await queryClient.fetchQuery(queryOptions);
  };
}

/**
 * Processes a single batch of sync data
 */
export async function processBatch(
  response: SyncResponse,
  websiteSlug: string
): Promise<{
  conversations: SyncConversation[];
  messages: SyncMessage[];
}> {
  const conversations = response.conversations || [];
  const messages = response.messages || [];

  // Save to local database
  if (conversations.length > 0) {
    await saveConversations(websiteSlug, conversations);
  }

  if (messages.length > 0) {
    await saveMessages(websiteSlug, messages);
  }

  return { conversations, messages };
}

/**
 * Executes the main sync loop - Sequential processing is required for pagination
 */
export async function executeSyncLoop(
  fetchBatch: (cursor: string | null, page: number) => Promise<SyncResponse>,
  websiteSlug: string,
  initialCursor: string | null,
  isMountedRef: { current: boolean },
  config: SyncLoopConfig = {}
): Promise<SyncLoopResult> {
  const { maxPages, batchDelay, progressCallback } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let hasMore = true;
  let cursor = initialCursor;
  let page = 0;
  const allConversations: SyncConversation[] = [];
  const allMessages: SyncMessage[] = [];

  while (hasMore && page < maxPages && isMountedRef.current) {
    // Fetch data from the server (sequential pagination required)
    // biome-ignore lint: Sequential pagination requires await in loop
    const response = await fetchBatch(cursor, page);

    // Process and save the batch (must be sequential)
    const { conversations, messages } = await processBatch(
      response,
      websiteSlug
    );

    // Accumulate results
    allConversations.push(...conversations);
    allMessages.push(...messages);

    // Update progress
    const progress = Math.min(90, (page + 1) * 10);
    progressCallback(progress);

    // Update cursor
    if (response.cursor) {
      setSyncCursor(websiteSlug, response.cursor);
      cursor = response.cursor;
    }

    // Check if there's more data
    hasMore = response.hasMore;

    if (response.nextPage !== null) {
      page = response.nextPage;
    } else {
      break;
    }

    // Small delay to prevent overwhelming the server (throttling required)
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }
  }

  return {
    conversations: allConversations,
    messages: allMessages,
  };
}
