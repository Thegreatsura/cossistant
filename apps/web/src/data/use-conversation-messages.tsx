"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { createConversationMessagesInfiniteQueryKey } from "./conversation-message-cache";

interface UseConversationHeadersOptions {
	limit?: number;
	enabled?: boolean;
}

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
        }).queryKey;

        const query = useInfiniteQuery({
                queryKey: createConversationMessagesInfiniteQueryKey(baseQueryKey),
                queryFn: async ({ pageParam }) => {
                        const response = await queryClient.fetchQuery(
                                trpc.conversation.getConversationMessages.queryOptions({
					websiteSlug,
					conversationId,
					limit: options?.limit ?? 50,
					cursor: pageParam ?? null,
				}),
			);

			return response;
		},
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null as Date | null,
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000,
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
