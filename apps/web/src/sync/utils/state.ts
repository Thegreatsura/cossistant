/**
 * State management utilities for sync operations
 */

import { type MutableRefObject, useRef, useState } from "react";

export interface SyncState {
  isSyncing: boolean;
  syncProgress: number;
  lastSyncedAt: Date | null;
  error: Error | null;
}

export interface SyncStateSetters {
  setIsSyncing: (value: boolean) => void;
  setSyncProgress: (value: number) => void;
  setLastSyncedAt: (value: Date | null) => void;
  setError: (value: Error | null) => void;
}

export interface SyncRefs {
  isMountedRef: MutableRefObject<boolean>;
  syncInProgressRef: MutableRefObject<boolean>;
}

export function useSyncState(): SyncState & SyncStateSetters {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  return {
    isSyncing,
    syncProgress,
    lastSyncedAt,
    error,
    setIsSyncing,
    setSyncProgress,
    setLastSyncedAt,
    setError,
  };
}

export function useSyncRefs(): SyncRefs {
  const isMountedRef = useRef(true);
  const syncInProgressRef = useRef(false);

  return {
    isMountedRef,
    syncInProgressRef,
  };
}

export function resetSyncState(setters: SyncStateSetters): void {
  setters.setIsSyncing(false);
  setters.setSyncProgress(0);
  setters.setError(null);
}

export function initiateSyncState(
  setters: SyncStateSetters,
  syncInProgressRef: MutableRefObject<boolean>
): boolean {
  if (syncInProgressRef.current) {
    console.log("Sync already in progress, skipping...");
    return false;
  }

  syncInProgressRef.current = true;
  setters.setIsSyncing(true);
  setters.setError(null);
  setters.setSyncProgress(0);
  return true;
}

export function finalizeSyncState(
  setters: SyncStateSetters,
  syncInProgressRef: MutableRefObject<boolean>,
  isMountedRef: MutableRefObject<boolean>
): void {
  if (isMountedRef.current) {
    setters.setIsSyncing(false);
    setters.setSyncProgress(0);
  }
  syncInProgressRef.current = false;
}

export function calculateProgress(
  currentPage: number,
  maxProgress = 90
): number {
  return Math.min(maxProgress, (currentPage + 1) * 10);
}
