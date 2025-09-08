/**
 * Event handling utilities for sync triggers
 */

import { type MutableRefObject, useEffect } from "react";

export interface SyncEventConfig {
  enabled: boolean;
  performSync: () => Promise<void>;
  syncInProgressRef: MutableRefObject<boolean>;
  isMountedRef: MutableRefObject<boolean>;
  syncIntervalMs?: number;
}

const DEFAULT_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

/**
 * Sets up automatic sync triggers based on various events
 */
export function useSyncEventHandlers({
  enabled,
  performSync,
  syncInProgressRef,
  isMountedRef,
  syncIntervalMs = DEFAULT_SYNC_INTERVAL,
}: SyncEventConfig): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial sync on mount
    performSync();

    // Handler for when app becomes visible
    const handleVisibilityChange = createVisibilityChangeHandler(
      performSync,
      syncInProgressRef
    );

    // Handler for when app comes online
    const handleOnline = createOnlineHandler(performSync, syncInProgressRef);

    // Setup event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Setup periodic sync
    const interval = setupPeriodicSync(
      performSync,
      syncInProgressRef,
      syncIntervalMs
    );

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, [enabled, performSync, syncInProgressRef, isMountedRef, syncIntervalMs]);
}

/**
 * Creates a handler for visibility change events
 */
export function createVisibilityChangeHandler(
  performSync: () => Promise<void>,
  syncInProgressRef: MutableRefObject<boolean>
): () => void {
  return () => {
    if (shouldTriggerSync(syncInProgressRef)) {
      performSync();
    }
  };
}

/**
 * Creates a handler for online events
 */
export function createOnlineHandler(
  performSync: () => Promise<void>,
  syncInProgressRef: MutableRefObject<boolean>
): () => void {
  return () => {
    if (!syncInProgressRef.current) {
      performSync();
    }
  };
}

/**
 * Sets up periodic sync when the app is visible
 */
export function setupPeriodicSync(
  performSync: () => Promise<void>,
  syncInProgressRef: MutableRefObject<boolean>,
  intervalMs: number
): NodeJS.Timeout {
  return setInterval(() => {
    if (shouldTriggerSync(syncInProgressRef)) {
      performSync();
    }
  }, intervalMs);
}

/**
 * Determines if sync should be triggered based on current conditions
 */
export function shouldTriggerSync(
  syncInProgressRef: MutableRefObject<boolean>
): boolean {
  return document.visibilityState === "visible" && !syncInProgressRef.current;
}

/**
 * Manual sync trigger with debouncing
 */
export function createManualSyncTrigger(
  performSync: () => Promise<void>,
  syncInProgressRef: MutableRefObject<boolean>
): () => Promise<void> {
  return async () => {
    if (!syncInProgressRef.current) {
      await performSync();
    }
  };
}
