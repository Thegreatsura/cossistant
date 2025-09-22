import type { CossistantClient } from "@cossistant/core";
import type { Message } from "@cossistant/types";
import {
	type QueryClient,
	useInfiniteQuery,
	useQueryClient,
} from "@tanstack/react-query";
import React from "react";
import {
	type PaginatedMessagesCache,
	type PaginatedMessagesResponse,
	removeMessageFromCache,
	setMessagesInCache,
	upsertMessageInCache,
} from "../utils/message-cache";
import { PENDING_CONVERSATION_ID } from "../../utils/id";

const QUERY_KEYS = {
	messages: (conversationId: string) =>
		["support", "messages", conversationId, { type: "infinite" }] as const,
};

type UseMessagesOptions = {
	client: CossistantClient | null;
	conversationId: string;
	defaultMessages?: Message[];
	pageSize?: number;
	enabled?: boolean;
};

export function useMessages({
	client,
	conversationId,
	defaultMessages = [],
	pageSize = 50,
	enabled = true,
}: UseMessagesOptions) {
	const queryClient = useQueryClient();
	const queryKey = QUERY_KEYS.messages(conversationId);

	console.log("[useMessages] Hook called with:", {
		conversationId,
		queryKey,
		hasQueryClient: !!queryClient,
		queryCacheSize: queryClient.getQueryCache().getAll().length,
	});

	// Check if we already have cached data from realtime events
	const existingData =
		queryClient.getQueryData<PaginatedMessagesCache>(queryKey);

	const query = useInfiniteQuery<PaginatedMessagesResponse>({
		queryKey,
		queryFn: async ({ pageParam }) => {
			// If no client or it's a pending conversation, return default messages
			if (!client || conversationId === PENDING_CONVERSATION_ID) {
				return {
					messages: defaultMessages,
					nextCursor: undefined,
					hasNextPage: false,
				};
			}

			try {
				const response = await client.getConversationMessages({
					conversationId,
					limit: pageSize,
					cursor: pageParam as string | undefined,
				});

				return {
					messages: response.messages,
					nextCursor: response.nextCursor,
					hasNextPage: response.hasNextPage,
				};
			} catch (error) {
				console.error("Failed to fetch messages:", error);
				return {
					messages: [],
					nextCursor: undefined,
					hasNextPage: false,
				};
			}
		},
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
		enabled: enabled && !!client,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		// Use existing cached data if available (from realtime events)
		initialData: existingData,
	});

	// Flatten all pages into a single array of messages
	const messages = React.useMemo(() => {
		console.log(
			"[useMessages] Computing messages from query data:",
			query.data
		);
		if (!query.data?.pages) {
			return defaultMessages;
		}
		const flatMessages = query.data.pages.flatMap((page) => page.messages);
		console.log("[useMessages] Flattened messages count:", flatMessages.length);
		return flatMessages;
	}, [query.data, defaultMessages]);

	// Debug: Log when query data changes
	React.useEffect(() => {
		console.log("[useMessages] Query data changed:", {
			conversationId,
			dataVersion: query.dataUpdatedAt,
			pagesCount: query.data?.pages?.length,
			totalMessages: query.data?.pages?.flatMap((p) => p.messages).length,
		});
	}, [query.data, query.dataUpdatedAt, conversationId]);

	return {
		messages,
		data: query.data,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isFetchingNextPage: query.isFetchingNextPage,
		hasNextPage: query.hasNextPage,
		fetchNextPage: query.fetchNextPage,
		error: query.error,
		refetch: query.refetch,
	};
}

/**
 * Add or update a message in the query cache from realtime events
 */
export function upsertRealtimeMessageInCache(
	queryClient: QueryClient,
	conversationId: string,
	message: Message
) {
	const queryKey = QUERY_KEYS.messages(conversationId);

	console.log("[upsertRealtimeMessageInCache] Updating cache", {
		queryKey,
		conversationId,
		messageId: message.id,
		hasQueryClient: !!queryClient,
		queryCacheSize: queryClient.getQueryCache().getAll().length,
	});

	// Check if the query exists
	const query = queryClient.getQueryCache().find({
		queryKey,
		exact: true,
	});

	if (query) {
		console.log("[upsertRealtimeMessageInCache] Query exists, updating it");
		const oldData = queryClient.getQueryData<PaginatedMessagesCache>(queryKey);
		const newData = upsertMessageInCache(oldData, message);
		queryClient.setQueryData<PaginatedMessagesCache>(queryKey, newData);
	} else {
		console.log(
			"[upsertRealtimeMessageInCache] Query doesn't exist yet, creating it"
		);
		// Initialize the query with the new message
		queryClient.setQueryData<PaginatedMessagesCache>(queryKey, {
			pages: [
				{
					messages: [message],
					nextCursor: undefined,
					hasNextPage: false,
				},
			],
			pageParams: [undefined],
		});
	}

	// Force React Query to notify subscribers
	queryClient.invalidateQueries({
		queryKey,
		exact: true,
	});
}

/**
 * Remove a message from the query cache
 */
export function removeMessageFromQueryCache(
	queryClient: QueryClient,
	conversationId: string,
	messageId: string
) {
	const queryKey = QUERY_KEYS.messages(conversationId);

	queryClient.setQueryData<PaginatedMessagesCache>(queryKey, (oldData) =>
		removeMessageFromCache(oldData, messageId)
	);
}

/**
 * Set initial messages in the query cache
 */
export function setMessagesInQueryCache(
	queryClient: QueryClient,
	conversationId: string,
	messages: Message[]
) {
	const queryKey = QUERY_KEYS.messages(conversationId);

	queryClient.setQueryData<PaginatedMessagesCache>(
		queryKey,
		setMessagesInCache(messages)
	);
}

/**
 * Cancel any ongoing queries for messages
 */
export async function cancelMessagesQueries(
	queryClient: QueryClient,
	conversationId: string
) {
	const queryKey = QUERY_KEYS.messages(conversationId);
	await queryClient.cancelQueries({ queryKey });
}
