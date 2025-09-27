import type {
	CossistantClient,
	WebsiteState,
	WebsiteStore,
} from "@cossistant/core";
import type { PublicWebsiteResponse } from "@cossistant/types";
import { useMemo } from "react";
import { useClientQuery } from "./use-client-query";
import { useStoreSelector } from "./use-store-selector";

const EMPTY_STATE: WebsiteState = {
	website: null,
	status: "idle",
	error: null,
};

const EMPTY_STORE: WebsiteStore = {
	getState: () => EMPTY_STATE,
	setState: (_updater) => {
		// noop
	},
	subscribe: (_listener) => () => {
		// noop
	},
	batch: (fn: () => void) => {
		fn();
	},
	setLoading: () => {
		// noop
	},
	setWebsite: (_website) => {
		// noop
	},
	setError: (_error) => {
		// noop
	},
	reset: () => {
		// noop
	},
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

export function useWebsiteStore(
	client: CossistantClient | null,
	options: UseWebsiteStoreOptions = {}
): UseWebsiteStoreResult {
	const store = client?.websiteStore ?? EMPTY_STORE;
	const state = useStoreSelector(store, (current) => current);

	const query = useClientQuery<PublicWebsiteResponse, { force?: boolean }>({
		client,
		queryKey: ["website", client],
		queryFn: (instance, params) => instance.fetchWebsite(params ?? {}),
		enabled: Boolean(client),
		refetchInterval: options.refetchInterval ?? false,
		refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
		refetchOnMount: state.status === "idle",
		initialData: state.website ?? undefined,
	});

	const error = useMemo(
		() => toError(state, query.error),
		[state, query.error]
	);
	const isLoading = client
		? query.isLoading || state.status === "loading" || state.status === "idle"
		: false;

	const refresh = () => {
		if (!client) {
			return Promise.resolve(null);
		}

		return query
			.refetch({ force: true })
			.then((result) => result ?? client.websiteStore.getState().website)
			.catch(() => client.websiteStore.getState().website)
			.then((website) => website ?? null);
	};

	return {
		website: client ? state.website : null,
		status: client ? state.status : "idle",
		isLoading,
		error,
		refresh,
	};
}
