/** biome-ignore-all lint/nursery/noAwaitInLoop: ok in this sync hook */
import type { SyncConversation } from "@cossistant/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { getCursor, saveConversations } from "../db";

interface UseSyncDataOptions {
  websiteId: string;
  websiteSlug: string;
  enabled?: boolean;
  onSyncComplete?: (conversations: SyncConversation[]) => void;
  onSyncError?: (error: Error) => void;
}

interface UseSyncDataReturn {
  isSyncing: boolean;
  syncProgress: number;
  lastSyncedAt: Date | null;
  error: Error | null;
  triggerSync: () => Promise<void>;
}

export function useSyncData({
  websiteId,
  websiteSlug,
  enabled = true,
  onSyncComplete,
  onSyncError,
}: UseSyncDataOptions): UseSyncDataReturn {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const syncInProgressRef = useRef(false);

  // Helper function to fetch a single batch of conversations
  const fetchBatch = useCallback(
    async (cursor: string | null) => {
      return await queryClient.fetchQuery(
        trpc.sync.conversations.queryOptions({
          websiteId,
          cursor,
          limit: 50,
        })
      );
    },
    [trpc, queryClient, websiteId]
  );

  // Helper function to process sync results
  const processSyncResults = useCallback(
    async (allConversations: SyncConversation[]) => {
      setSyncProgress(100);
      setLastSyncedAt(new Date());

      if (onSyncComplete) {
        onSyncComplete(allConversations);
      }

      console.log(
        `Sync completed: ${allConversations.length} conversations synced`
      );
    },
    [onSyncComplete]
  );

  // Helper function to handle sync errors
  const handleSyncError = useCallback(
    (err: Error) => {
      console.error("Sync error:", err);
      setError(err);

      if (onSyncError) {
        onSyncError(err);
      }
    },
    [onSyncError]
  );

  // Helper function to execute the sync loop
  const executeSyncLoop = useCallback(
    async (initialCursor: string | null) => {
      let hasMore = true;
      let currentCursor = initialCursor;
      let allConversations: SyncConversation[] = [];
      let iteration = 0;
      const maxIterations = 100;

      while (hasMore && iteration < maxIterations && isMountedRef.current) {
        // Fetch data from the server
        const response = await fetchBatch(currentCursor);

        // Save conversations to local database
        if (response.conversations.length > 0) {
          await saveConversations(websiteSlug, response.conversations);
          allConversations = [...allConversations, ...response.conversations];
        }

        // Update progress (approximate based on iterations)
        setSyncProgress(Math.min(90, (iteration + 1) * 10));

        // Check if there's more data to fetch
        hasMore = response.hasMore;
        currentCursor = response.cursor;
        iteration++;

        // Small delay to prevent overwhelming the server
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return allConversations;
    },
    [fetchBatch, websiteSlug]
  );

  const performSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      console.log("Sync already in progress, skipping...");
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    setError(null);
    setSyncProgress(0);

    try {
      // Get the latest cursor from the local database
      const cursor = await getCursor(websiteSlug, "conversations");

      // Execute the sync loop
      const allConversations = await executeSyncLoop(cursor);

      if (!isMountedRef.current) {
        return;
      }

      // Process sync results
      await processSyncResults(allConversations);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      handleSyncError(err as Error);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        setSyncProgress(0);
      }
      syncInProgressRef.current = false;
    }
  }, [websiteSlug, executeSyncLoop, processSyncResults, handleSyncError]);

  // Trigger sync on mount and when app becomes visible
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial sync
    performSync();

    // Sync when app becomes visible again
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !syncInProgressRef.current
      ) {
        performSync();
      }
    };

    // Sync when app comes online
    const handleOnline = () => {
      if (!syncInProgressRef.current) {
        performSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Periodic sync every 10 minutes when the app is visible
    const interval = setInterval(
      () => {
        if (
          document.visibilityState === "visible" &&
          !syncInProgressRef.current
        ) {
          performSync();
        }
      },
      10 * 60 * 1000
    );

    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [enabled, performSync]);

  return {
    isSyncing,
    syncProgress,
    lastSyncedAt,
    error,
    triggerSync: performSync,
  };
}
