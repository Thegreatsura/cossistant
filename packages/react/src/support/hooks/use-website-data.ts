import type { CossistantClient } from "@cossistant/core";
import type { PublicWebsiteResponse } from "@cossistant/types";
import { useQuery } from "@tanstack/react-query";

export interface UseWebsiteDataResult {
	website: PublicWebsiteResponse | null;
	isLoading: boolean;
	error: Error | null;
}

export function useWebsiteData(
	client: CossistantClient | null,
): UseWebsiteDataResult {
	const { data, isLoading, error } = useQuery({
		queryKey: ["website", client?.getConfiguration().publicKey],
		queryFn: async () => {
			if (!client) {
				throw new Error("No client available");
			}
			return client.getWebsite();
		},
		enabled: !!client,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	return {
		website: data ?? null,
		isLoading,
		error: error as Error | null,
	};
}
