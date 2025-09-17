"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

type UseConversationHeadersOptions = {
	limit?: number;
	enabled?: boolean;
};

const DEFAULT_PAGE_LIMIT = 50;

// 5 minutes
const STALE_TIME = 300_000_000;

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

	const query = useInfiniteQuery({
		queryKey: [
			...trpc.conversation.getConversationMessages.queryOptions({
				websiteSlug,
				conversationId,
			}).queryKey,
			{ type: "infinite" },
		],
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
		initialPageParam: null as Date | null,
		enabled: options?.enabled ?? true,
		staleTime: STALE_TIME,
	});

	const messages = query.data?.pages.flatMap((page) => page.items) ?? [];

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
