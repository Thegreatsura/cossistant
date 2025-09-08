import type { SyncConversation, SyncMessage } from "@cossistant/types";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTRPC } from "@/lib/trpc/client";
import {
  createBatchFetcher,
  executeSyncLoop,
  finalizeSyncState,
  getSyncCursor,
  handleSyncError,
  handleSyncSuccess,
  initiateSyncState,
  useSyncEventHandlers,
  useSyncRefs,
  useSyncState,
} from "../utils";

interface UseSyncOptions {
  websiteId: string;
  websiteSlug: string;
  enabled?: boolean;
  onSyncComplete?: (data: {
    conversations: SyncConversation[];
    messages: SyncMessage[];
  }) => void;
  onSyncError?: (error: Error) => void;
}

interface UseSyncReturn {
  isSyncing: boolean;
  syncProgress: number;
  lastSyncedAt: Date | null;
  error: Error | null;
  triggerSync: () => Promise<void>;
}

export function useSync({
  websiteId,
  websiteSlug,
  enabled = true,
  onSyncComplete,
  onSyncError,
}: UseSyncOptions): UseSyncReturn {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Use the state management utilities
  const {
    isSyncing,
    syncProgress,
    lastSyncedAt,
    error,
    setIsSyncing,
    setSyncProgress,
    setLastSyncedAt,
    setError,
  } = useSyncState();

  // Use refs utilities
  const { isMountedRef, syncInProgressRef } = useSyncRefs();

  // Create the batch fetcher - memoized to prevent recreating on every render
  const fetchBatch = React.useMemo(
    () => createBatchFetcher(queryClient, trpc, websiteId),
    [queryClient, trpc, websiteId]
  );

  // Define state setters for utilities - use useMemo to maintain reference
  const stateSetters = React.useMemo(
    () => ({
      setIsSyncing,
      setSyncProgress,
      setLastSyncedAt,
      setError,
    }),
    [setIsSyncing, setSyncProgress, setLastSyncedAt, setError]
  );

  // Main sync function using utilities
  const performSync = React.useCallback(async () => {
    // Check if sync can be initiated
    if (!initiateSyncState(stateSetters, syncInProgressRef)) {
      return;
    }

    try {
      // Get the current sync cursor
      const cursor = getSyncCursor(websiteSlug);

      // Execute the sync loop with progress callback
      const result = await executeSyncLoop(
        fetchBatch,
        websiteSlug,
        cursor,
        isMountedRef,
        {
          maxPages: 100,
          batchDelay: 100,
          progressCallback: setSyncProgress,
        }
      );

      // Handle successful sync
      if (isMountedRef.current) {
        handleSyncSuccess(result, stateSetters, onSyncComplete);
      }
    } catch (err) {
      // Handle sync error
      if (isMountedRef.current) {
        handleSyncError(err as Error, stateSetters, onSyncError);
      }
    } finally {
      // Finalize sync state
      finalizeSyncState(stateSetters, syncInProgressRef, isMountedRef);
    }
  }, [
    websiteSlug,
    fetchBatch,
    onSyncComplete,
    onSyncError,
    stateSetters,
    setSyncProgress,
    syncInProgressRef,
    isMountedRef,
  ]);

  // Setup event handlers for automatic sync
  useSyncEventHandlers({
    enabled,
    performSync,
    syncInProgressRef,
    isMountedRef,
    syncIntervalMs: 10 * 60 * 1000, // 10 minutes
  });

  return {
    isSyncing,
    syncProgress,
    lastSyncedAt,
    error,
    triggerSync: performSync,
  };
}
