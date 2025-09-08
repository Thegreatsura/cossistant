/**
 * Utilities for managing sync cursor state in localStorage
 */

const CURSOR_STORAGE_KEY = (websiteSlug: string) =>
  `cossistant_sync_cursor_${websiteSlug}`;

export function getSyncCursor(websiteSlug: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(CURSOR_STORAGE_KEY(websiteSlug));
}

export function setSyncCursor(
  websiteSlug: string,
  cursor: string | null
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (cursor) {
    localStorage.setItem(CURSOR_STORAGE_KEY(websiteSlug), cursor);
  } else {
    localStorage.removeItem(CURSOR_STORAGE_KEY(websiteSlug));
  }
}

export function clearSyncCursor(websiteSlug: string): void {
  setSyncCursor(websiteSlug, null);
}
