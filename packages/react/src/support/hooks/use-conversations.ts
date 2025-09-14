import type { CossistantClient } from "@cossistant/core";
import type { ListConversationsResponse } from "@cossistant/types/api/conversation";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../utils/query-keys";

export interface UseConversationsResult {
	conversations: ListConversationsResponse["conversations"] | null;
	pagination: ListConversationsResponse["pagination"] | null;
	isLoading: boolean;
	error: Error | null;
}

export function useConversations(
	client: CossistantClient | null,
	params: { limit?: number; enabled?: boolean } = {},
): UseConversationsResult {
	const isEnabled = !!client && params.enabled !== false;

	const { data, isLoading, error } = useQuery({
		queryKey: QUERY_KEYS.conversations(),
		queryFn: async () => {
			if (!client) {
				throw new Error("No client available");
			}

			return client.listConversations({
				limit: params.limit || 10,
				orderBy: "createdAt",
				order: "asc",
			});
		},
		enabled: isEnabled,
		staleTime: 5 * 60 * 1000,
	});

	return {
		conversations: data?.conversations || [],
		pagination: data?.pagination ?? null,
		isLoading,
		error: error as Error | null,
	};
}
