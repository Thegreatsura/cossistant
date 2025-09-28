import type {
	ConversationPagination,
	ConversationsState,
	CossistantClient,
} from "@cossistant/core";
import type {
	ListConversationsRequest,
	ListConversationsResponse,
} from "@cossistant/types/api/conversation";
import { useMemo } from "react";
import { useSupport } from "../provider";
import { useStoreSelector } from "./store/use-store-selector";
import { useClientQuery } from "./utils/use-client-query";

type ConversationsSelection = {
	conversations: ListConversationsResponse["conversations"];
	pagination: ConversationPagination | null;
};

const EMPTY_STATE: ConversationsState = {
	ids: [],
	byId: {},
	pagination: null,
};

const EMPTY_STORE = {
	getState: (): ConversationsState => EMPTY_STATE,
	subscribe: () => () => {
		// noop
	},
};

const DEFAULT_OPTIONS: UseConversationsOptions = {
	limit: undefined,
	page: undefined,
	order: undefined,
	orderBy: undefined,
	status: undefined,
	enabled: true,
	refetchInterval: false,
	refetchOnWindowFocus: true,
};

function isClientLike(value: unknown): value is CossistantClient {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as CossistantClient).listConversations === "function"
	);
}

function areSelectionsEqual(
	a: ConversationsSelection,
	b: ConversationsSelection
): boolean {
	if (a.pagination !== b.pagination) {
		if (!(a.pagination && b.pagination)) {
			return false;
		}
		if (
			a.pagination.page !== b.pagination.page ||
			a.pagination.limit !== b.pagination.limit ||
			a.pagination.total !== b.pagination.total ||
			a.pagination.totalPages !== b.pagination.totalPages ||
			a.pagination.hasMore !== b.pagination.hasMore
		) {
			return false;
		}
	}

	if (a.conversations.length !== b.conversations.length) {
		return false;
	}

	for (let index = 0; index < a.conversations.length; index += 1) {
		if (a.conversations[index] !== b.conversations[index]) {
			return false;
		}
	}

	return true;
}

export type UseConversationsOptions = Partial<
	Omit<ListConversationsRequest, "visitorId" | "externalVisitorId">
> & {
	enabled?: boolean;
	refetchInterval?: number | false;
	refetchOnWindowFocus?: boolean;
};

export type UseConversationsResult = {
	conversations: ListConversationsResponse["conversations"];
	pagination: ConversationPagination | null;
	isLoading: boolean;
	error: Error | null;
	refetch: (
		args?: Partial<ListConversationsRequest>
	) => Promise<ListConversationsResponse | undefined>;
};

export function useConversations(
	options?: UseConversationsOptions
): UseConversationsResult;

export function useConversations(
	client: CossistantClient | null,
	options?: UseConversationsOptions
): UseConversationsResult;

export function useConversations(
	clientOrOptions?: CossistantClient | null | UseConversationsOptions,
	maybeOptions?: UseConversationsOptions
): UseConversationsResult {
	const { client } = useSupport();
	let resolvedOptions: UseConversationsOptions;

	if (isClientLike(clientOrOptions) || clientOrOptions === null) {
		resolvedOptions = { ...DEFAULT_OPTIONS, ...(maybeOptions ?? {}) };
	} else {
		resolvedOptions = { ...DEFAULT_OPTIONS, ...(clientOrOptions ?? {}) };
	}

	const store = client?.conversationsStore ?? EMPTY_STORE;

	const selection = useStoreSelector(
		store,
		(state): ConversationsSelection => ({
			conversations: state.ids
				.map((id) => state.byId[id])
				.filter(
					(
						conversation
					): conversation is ListConversationsResponse["conversations"][number] =>
						Boolean(conversation)
				),
			pagination: state.pagination,
		}),
		areSelectionsEqual
	);

	const { enabled, refetchInterval, refetchOnWindowFocus, requestDefaults } =
		useMemo(() => {
			const {
				enabled: enabledOption,
				refetchInterval: refetchIntervalOption,
				refetchOnWindowFocus: refetchOnWindowFocusOption,
				...requestDefaultsOption
			} = resolvedOptions;

			return {
				enabled: enabledOption,
				refetchInterval: refetchIntervalOption,
				refetchOnWindowFocus: refetchOnWindowFocusOption,
				requestDefaults: requestDefaultsOption,
			};
		}, [resolvedOptions]);

	const clientKey = useMemo(() => {
		if (!client) {
			return "no-client";
		}
		const configuration = client.getConfiguration();
		return `${configuration.publicKey ?? "anon"}|${configuration.apiUrl ?? ""}`;
	}, [client]);

	const {
		refetch: queryRefetch,
		isLoading: queryLoading,
		error,
	} = useClientQuery<
		ListConversationsResponse,
		Partial<ListConversationsRequest>
	>({
		client,
		queryKey: [
			"conversations",
			clientKey,
			requestDefaults.limit ?? null,
			requestDefaults.page ?? null,
			requestDefaults.status ?? null,
			requestDefaults.orderBy ?? null,
			requestDefaults.order ?? null,
		],
		queryFn: (instance, args) =>
			instance.listConversations({
				...requestDefaults,
				...args,
			}),
		enabled: Boolean(client && enabled),
		refetchInterval,
		refetchOnWindowFocus,
		refetchOnMount: selection.conversations.length === 0,
		initialArgs: requestDefaults,
	});

	const refetch = useMemo(() => {
		return (args?: Partial<ListConversationsRequest>) =>
			queryRefetch({
				...requestDefaults,
				...args,
			});
	}, [queryRefetch, requestDefaults]);

	const isInitialLoad = selection.conversations.length === 0;
	const isLoading = isInitialLoad ? queryLoading : false;

	return {
		conversations: selection.conversations,
		pagination: selection.pagination,
		isLoading,
		error,
		refetch,
	};
}
