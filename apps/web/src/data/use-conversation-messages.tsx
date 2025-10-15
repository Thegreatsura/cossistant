"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { createConversationMessagesInfiniteQueryKey } from "./conversation-message-cache";

type UseConversationHeadersOptions = {
	limit?: number;
	enabled?: boolean;
};

const DEFAULT_PAGE_LIMIT = 50;

// 5 minutes
const STALE_TIME = 300_000;

export function useConversationMessages({
	websiteSlug,
	conversationId,
	options,
}: {
	websiteSlug: string;
	conversationId: string;
	options?: UseConversationHeadersOptions;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const baseQueryKey = trpc.conversation.getConversationMessages.queryOptions({
		websiteSlug,
		conversationId,
		// ensure cache key differentiates by page size
		limit: options?.limit ?? 50,
	}).queryKey;

	const query = useInfiniteQuery({
		queryKey: createConversationMessagesInfiniteQueryKey(baseQueryKey),
		queryFn: async ({ pageParam }) => {
			const response = await queryClient.fetchQuery(
				trpc.conversation.getConversationMessages.queryOptions({
					websiteSlug,
					conversationId,
					limit: options?.limit ?? DEFAULT_PAGE_LIMIT,
					cursor: pageParam ?? null,
				})
			);

			return response;
		},
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null as string | null,
		enabled: options?.enabled ?? true,
		staleTime: STALE_TIME,
	});

	const messages =
		query.data?.pages
			.flatMap((page) => page.items)
			.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			) ?? [];

	return {
		messages,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isFetchingNextPage: query.isFetchingNextPage,
		hasNextPage: query.hasNextPage,
		fetchNextPage: query.fetchNextPage,
		error: query.error,
		refetch: query.refetch,
	};
}
