"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

interface UseConversationHeadersOptions {
  limit?: number;
  enabled?: boolean;
}

export function useConversationHeaders(
  websiteSlug: string,
  options?: UseConversationHeadersOptions
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [
      ...trpc.conversation.listConversationsHeaders.queryOptions({
        websiteSlug,
      }).queryKey,
      { type: "infinite" },
    ],
    queryFn: async ({ pageParam }) => {
      const response = await queryClient.fetchQuery(
        trpc.conversation.listConversationsHeaders.queryOptions({
          websiteSlug,
          limit: options?.limit ?? 500,
          cursor: pageParam ?? null,
        })
      );

      return response;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const conversations = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    conversations,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}
