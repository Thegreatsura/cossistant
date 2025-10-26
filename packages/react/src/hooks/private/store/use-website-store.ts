import type {
	CossistantClient,
	WebsiteState,
	WebsiteStore,
} from "@cossistant/core";
import type { PublicWebsiteResponse } from "@cossistant/types";
import { useMemo } from "react";
import { useClientQuery } from "../use-client-query";
import { useStoreSelector } from "./use-store-selector";

const EMPTY_STATE: WebsiteState = {
	website: null,
	status: "idle",
	error: null,
};

export type UseWebsiteStoreResult = {
	website: WebsiteState["website"];
	status: WebsiteState["status"];
	isLoading: boolean;
	error: Error | null;
	refresh: () => Promise<WebsiteState["website"] | null>;
};

export type UseWebsiteStoreOptions = {
	refetchInterval?: number | false;
	refetchOnWindowFocus?: boolean;
};

function toError(state: WebsiteState, fallback: Error | null): Error | null {
	if (fallback) {
		return fallback;
	}

	if (!state.error) {
		return null;
	}

	return new Error(state.error.message);
}

/**
 * Subscribes to the shared website store on the SDK client and exposes
 * convenient loading/error state plus a manual refresh helper.
 */
export function useWebsiteStore(
	client: CossistantClient,
	options: UseWebsiteStoreOptions = {}
): UseWebsiteStoreResult {
	const store =
		client.websiteStore ??
		((): WebsiteStore => {
			throw new Error("Website store is not available on the client instance");
		})();
	const state = useStoreSelector(store, (current) => current);

	const query = useClientQuery<PublicWebsiteResponse, { force?: boolean }>({
		client,
		queryFn: (instance, params) => instance.fetchWebsite(params ?? {}),
		enabled: true,
		refetchInterval: options.refetchInterval ?? false,
		refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
		refetchOnMount: state.status === "idle",
		initialData: state.website ?? undefined,
	});

	const error = useMemo(
		() => toError(state, query.error),
		[state, query.error]
	);
	const isLoading =
		query.isLoading || state.status === "loading" || state.status === "idle";

	const refresh = () =>
		query
			.refetch({ force: true })
			.then((result) => result ?? client.websiteStore.getState().website)
			.catch(() => client.websiteStore.getState().website)
			.then((website) => website ?? null);

	return {
		website: state.website,
		status: state.status,
		isLoading,
		error,
		refresh,
	};
}
