/**
 * Utilities for handling sync results and callbacks
 */

import type { SyncConversation, SyncMessage } from "@cossistant/types";
import type { SyncStateSetters } from "./state";

export interface SyncCallbacks {
  onSyncComplete?: (data: {
    conversations: SyncConversation[];
    messages: SyncMessage[];
  }) => void;
  onSyncError?: (error: Error) => void;
}

export interface SyncResult {
  conversations: SyncConversation[];
  messages: SyncMessage[];
}

/**
 * Handles successful sync completion
 */
export function handleSyncSuccess(
  result: SyncResult,
  setters: SyncStateSetters,
  onSyncComplete?: SyncCallbacks["onSyncComplete"]
): void {
  // Update state
  setters.setSyncProgress(100);
  setters.setLastSyncedAt(new Date());

  // Log success
  console.log(
    `Sync completed: ${result.conversations.length} conversations, ${result.messages.length} messages synced`
  );

  // Call callback if provided
  if (onSyncComplete) {
    onSyncComplete({
      conversations: result.conversations,
      messages: result.messages,
    });
  }
}

/**
 * Handles sync errors
 */
export function handleSyncError(
  error: Error,
  setters: SyncStateSetters,
  onSyncError?: SyncCallbacks["onSyncError"]
): void {
  console.error("Sync error:", error);

  // Update state
  setters.setError(error);

  // Call callback if provided
  if (onSyncError) {
    onSyncError(error);
  }
}

/**
 * Creates a wrapped sync handler with error handling
 */
export function createSyncHandler(
  syncFunction: () => Promise<SyncResult>,
  setters: SyncStateSetters,
  callbacks: SyncCallbacks,
  refs: {
    isMountedRef: { current: boolean };
    syncInProgressRef: { current: boolean };
  }
): () => Promise<void> {
  return async () => {
    try {
      const result = await syncFunction();

      if (!refs.isMountedRef.current) {
        return;
      }

      handleSyncSuccess(result, setters, callbacks.onSyncComplete);
    } catch (err) {
      if (!refs.isMountedRef.current) {
        return;
      }

      handleSyncError(err as Error, setters, callbacks.onSyncError);
    }
  };
}
