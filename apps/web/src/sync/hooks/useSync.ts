import type { SyncConversation, SyncMessage } from "@cossistant/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import {
	getCursor,
	saveConversations,
	saveMessages,
} from "../db";

type EntityType = "conversations" | "messages";

interface UseSyncOptions {
	websiteId: string;
	websiteSlug: string;
	entityType: EntityType;
	enabled?: boolean;
	onSyncComplete?: (items: SyncConversation[] | SyncMessage[]) => void;
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
	entityType,
	enabled = true,
	onSyncComplete,
	onSyncError,
}: UseSyncOptions): UseSyncReturn {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncProgress, setSyncProgress] = useState(0);
	const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const isMountedRef = useRef(true);
	const syncInProgressRef = useRef(false);

	const fetchBatch = useCallback(
		async (cursor: string | null) => {
			const queryOptions =
				entityType === "conversations"
					? trpc.sync.conversations.queryOptions({
							websiteId,
							cursor,
							limit: 50,
						})
					: trpc.sync.messages.queryOptions({
							websiteId,
							cursor,
							limit: 50,
						});

			return await queryClient.fetchQuery(queryOptions);
		},
		[trpc, queryClient, websiteId, entityType]
	);

	const saveItems = useCallback(
		async (items: any[]) => {
			if (entityType === "conversations") {
				await saveConversations(websiteSlug, items);
			} else {
				await saveMessages(websiteSlug, items);
			}
		},
		[websiteSlug, entityType]
	);

	const performSync = useCallback(async () => {
		if (syncInProgressRef.current) {
			return;
		}

		syncInProgressRef.current = true;
		setIsSyncing(true);
		setError(null);
		setSyncProgress(0);

		try {
			const cursor = await getCursor(websiteSlug, entityType);
			let hasMore = true;
			let currentCursor = cursor;
			let allItems: any[] = [];
			let iteration = 0;
			const maxIterations = 100;

			while (hasMore && iteration < maxIterations && isMountedRef.current) {
				const response = await fetchBatch(currentCursor);
				const items =
					entityType === "conversations"
						? response.conversations
						: response.messages;

				if (items.length > 0) {
					await saveItems(items);
					allItems = [...allItems, ...items];
				}

				setSyncProgress(Math.min(90, (iteration + 1) * 10));

				hasMore = response.hasMore;
				currentCursor = response.cursor;
				iteration++;

				if (hasMore) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			if (isMountedRef.current) {
				setSyncProgress(100);
				setLastSyncedAt(new Date());
				if (onSyncComplete) {
					onSyncComplete(allItems);
				}
			}
		} catch (err) {
			if (isMountedRef.current) {
				const error = err as Error;
				setError(error);
				if (onSyncError) {
					onSyncError(error);
				}
			}
		} finally {
			if (isMountedRef.current) {
				setIsSyncing(false);
				setSyncProgress(0);
			}
			syncInProgressRef.current = false;
		}
	}, [
		websiteSlug,
		entityType,
		fetchBatch,
		saveItems,
		onSyncComplete,
		onSyncError,
	]);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		performSync();

		const handleVisibilityChange = () => {
			if (
				document.visibilityState === "visible" &&
				!syncInProgressRef.current
			) {
				performSync();
			}
		};

		const handleOnline = () => {
			if (!syncInProgressRef.current) {
				performSync();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("online", handleOnline);

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