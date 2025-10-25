"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

type PrefetchConversationDataOptions = {
	websiteSlug: string;
	conversationId: string;
	visitorId: string;
	limit?: number;
};

export function usePrefetchConversationData() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const prefetchConversation = async ({
		websiteSlug,
		conversationId,
		visitorId,
		limit = 50,
	}: PrefetchConversationDataOptions) => {
		const prefetchPromises: Promise<void>[] = [];

		// Prefetch conversation timeline items
		const timelineItemsQueryOptions =
			trpc.conversation.getConversationTimelineItems.queryOptions({
				websiteSlug,
				conversationId,
				limit,
				cursor: null,
			});

		// Check if timeline items data is already cached
		const timelineItemsCachedData = queryClient.getQueryData(
			timelineItemsQueryOptions.queryKey
		);

		if (!timelineItemsCachedData) {
			prefetchPromises.push(
				queryClient.prefetchQuery(timelineItemsQueryOptions).catch((error) => {
					console.warn(
						"Failed to prefetch conversation timeline items:",
						error
					);
				})
			);
		}

		// Prefetch visitor data
		const visitorQueryOptions = trpc.conversation.getVisitorById.queryOptions({
			websiteSlug,
			visitorId,
		});

		// Check if visitor data is already cached
		const visitorCachedData = queryClient.getQueryData(
			visitorQueryOptions.queryKey
		);

		if (!visitorCachedData) {
			prefetchPromises.push(
				queryClient.prefetchQuery(visitorQueryOptions).catch((error) => {
					console.warn("Failed to prefetch visitor data:", error);
				})
			);
		}

		// Execute all prefetch operations in parallel
		await Promise.allSettled(prefetchPromises);
	};

	return {
		prefetchConversation,
	};
}
