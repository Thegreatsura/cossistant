import type {
	ConversationMessagesState,
	MessagesState,
} from "@cossistant/core";
import type {
	GetMessagesRequest,
	GetMessagesResponse,
} from "@cossistant/types/api/message";
import { useCallback, useMemo } from "react";
import { useSupport } from "../provider";
import { useStoreSelector } from "./store/use-store-selector";
import { useClientQuery } from "./utils/use-client-query";

const EMPTY_STATE: ConversationMessagesState = {
	messages: [],
	hasNextPage: false,
	nextCursor: undefined,
};

const EMPTY_MESSAGES_STORE = {
	getState: (): MessagesState => ({ conversations: {} }),
	subscribe: () => () => {
		// noop
	},
};

const DEFAULT_LIMIT = 50;

export type UseConversationMessagesOptions = {
	limit?: number;
	cursor?: string | null;
	enabled?: boolean;
	refetchInterval?: number | false;
	refetchOnWindowFocus?: boolean;
};

export type UseConversationMessagesResult = ConversationMessagesState & {
	isLoading: boolean;
	error: Error | null;
	refetch: (
		args?: Pick<GetMessagesRequest, "cursor" | "limit">
	) => Promise<GetMessagesResponse | undefined>;
	fetchNextPage: () => Promise<GetMessagesResponse | undefined>;
};

export function useConversationMessages(
	conversationId: string,
	options: UseConversationMessagesOptions = {}
): UseConversationMessagesResult {
	const { client } = useSupport();
	const store = client?.messagesStore ?? EMPTY_MESSAGES_STORE;

	const selection = useStoreSelector(store, (state) => {
		return state.conversations[conversationId] ?? EMPTY_STATE;
	});

	const baseArgs = useMemo(() => {
		return {
			limit: options.limit ?? DEFAULT_LIMIT,
			cursor: options.cursor ?? undefined,
		} satisfies Pick<GetMessagesRequest, "limit" | "cursor">;
	}, [options.cursor, options.limit]);

	const {
		refetch: queryRefetch,
		isLoading: queryLoading,
		error,
	} = useClientQuery<
		GetMessagesResponse,
		Pick<GetMessagesRequest, "cursor" | "limit">
	>({
		client: client ?? null,
		queryKey: [
			"conversationMessages",
			conversationId,
			baseArgs.limit,
			baseArgs.cursor ?? null,
		],
		queryFn: (instance, args) =>
			instance.getConversationMessages({
				conversationId,
				limit: args?.limit ?? baseArgs.limit,
				cursor: args?.cursor ?? baseArgs.cursor,
			}),
		enabled: Boolean((options.enabled ?? true) && client),
		refetchInterval: options.refetchInterval ?? false,
		refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
		refetchOnMount: selection.messages.length === 0,
		initialArgs: baseArgs,
	});

	const refetch = useCallback(
		(args?: Pick<GetMessagesRequest, "cursor" | "limit">) => {
			if (!client) {
				return Promise.resolve(undefined);
			}

			return queryRefetch({
				limit: baseArgs.limit,
				cursor: baseArgs.cursor,
				...args,
			});
		},
		[client, queryRefetch, baseArgs]
	);

	const fetchNextPage = useCallback(() => {
		if (!(selection.hasNextPage && selection.nextCursor)) {
			return Promise.resolve(undefined);
		}

		return refetch({ cursor: selection.nextCursor });
	}, [selection.hasNextPage, selection.nextCursor, refetch]);

	const isInitialLoad = selection.messages.length === 0;
	const isLoading = isInitialLoad ? queryLoading : false;

	return {
		messages: selection.messages,
		hasNextPage: selection.hasNextPage,
		nextCursor: selection.nextCursor,
		isLoading,
		error,
		refetch,
		fetchNextPage,
	};
}
