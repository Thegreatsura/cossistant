"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

interface UseConversationHeadersOptions {
  limit?: number;
  enabled?: boolean;
}

export function useConversationEvents({
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
      ...trpc.conversation.getConversationEvents.queryOptions({
        websiteSlug,
        conversationId,
      }).queryKey,
      { type: "infinite" },
    ],
    queryFn: async ({ pageParam }) => {
      const response = await queryClient.fetchQuery(
        trpc.conversation.getConversationEvents.queryOptions({
          websiteSlug,
          conversationId,
          limit: options?.limit ?? 50,
          cursor: pageParam ?? null,
        })
      );

      return response;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as Date | null,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });

  const events = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    events,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}
