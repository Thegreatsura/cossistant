"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { SortMode } from "@/components/conversations-list/types";

const STORAGE_KEY_PREFIX = "inbox-sort-";

function getStorageKey(websiteId: string): string {
	return `${STORAGE_KEY_PREFIX}${websiteId}`;
}

function getSnapshot(websiteId: string): SortMode {
	if (typeof window === "undefined") {
		return "smart";
	}

	const stored = localStorage.getItem(getStorageKey(websiteId));

	if (stored === "smart" || stored === "lastMessage") {
		return stored;
	}

	return "smart";
}

function subscribe(callback: () => void): () => void {
	window.addEventListener("storage", callback);

	return () => {
		window.removeEventListener("storage", callback);
	};
}

export function useInboxSortPreference(websiteId: string): {
	sortMode: SortMode;
	setSortMode: (mode: SortMode) => void;
} {
	const sortMode = useSyncExternalStore(
		subscribe,
		() => getSnapshot(websiteId),
		() => "smart" as SortMode
	);

	const setSortMode = useCallback(
		(mode: SortMode) => {
			localStorage.setItem(getStorageKey(websiteId), mode);
			// Dispatch storage event to notify other tabs/components
			window.dispatchEvent(new StorageEvent("storage"));
		},
		[websiteId]
	);

	return { sortMode, setSortMode };
}
