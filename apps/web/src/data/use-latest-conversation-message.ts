"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useTRPC } from "@/lib/trpc/client";
import {
	type ConversationMessagesPage,
	createConversationMessagesInfiniteQueryKey,
} from "./conversation-message-cache";

type LastTimelineItem = ConversationHeader["lastTimelineItem"];

type UseLatestConversationMessageOptions = {
	conversationId: string;
	websiteSlug: string;
	limit?: number;
};

function findLatestTimelineItem(
	data: InfiniteData<ConversationMessagesPage> | undefined
): LastTimelineItem {
	if (!data) {
		return null;
	}

	for (let pageIndex = data.pages.length - 1; pageIndex >= 0; pageIndex--) {
		const page = data.pages[pageIndex];
		const lastItem = page.items.at(-1);

		if (lastItem) {
			return lastItem as LastTimelineItem;
		}
	}

	return null;
}

export function useLatestConversationMessage({
	conversationId,
	websiteSlug,
	limit = 50,
}: UseLatestConversationMessageOptions): LastTimelineItem {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const baseQueryKey = useMemo(
		() =>
			trpc.conversation.getConversationTimelineItems.queryOptions({
				websiteSlug,
				conversationId,
				limit,
			}).queryKey,
		[conversationId, limit, trpc, websiteSlug]
	);

	const queryKey = useMemo(
		() => createConversationMessagesInfiniteQueryKey(baseQueryKey),
		[baseQueryKey]
	);

	const getSnapshot = useCallback(() => {
		const data =
			queryClient.getQueryData<InfiniteData<ConversationMessagesPage>>(
				queryKey
			);

		return findLatestTimelineItem(data);
	}, [queryClient, queryKey]);

	const subscribe = useCallback(
		(onStoreChange: () => void) =>
			queryClient.getQueryCache().subscribe(() => {
				onStoreChange();
			}),
		[queryClient]
	);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
