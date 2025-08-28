import type { CossistantClient, CossistantRestClient } from "@cossistant/core";
import { generateConversationId } from "@cossistant/core";
import type {
	CreateConversationRequestBody,
	CreateConversationResponseBody,
	ListConversationsResponse,
} from "@cossistant/types/api/conversation";
import type { Conversation } from "@cossistant/types/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	type PaginatedMessagesCache,
	setInitialMessagesInCache,
} from "../utils/message-cache";

export interface UseCreateConversationOptions {
	onSuccess?: (data: CreateConversationResponseBody) => void;
	onError?: (error: Error) => void;
}

export function useCreateConversation(
	client: CossistantClient | CossistantRestClient | null,
	options?: UseCreateConversationOptions
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: Partial<CreateConversationRequestBody> = {}) => {
			if (!client) {
				throw new Error("No client available");
			}

			// Generate conversation ID client-side for optimistic updates
			const conversationId = params.conversationId || generateConversationId();

			// Create the conversation
			const response = await client.createConversation({
				...params,
				conversationId,
			});

			return response;
		},
		onMutate: async (params) => {
			// Generate conversation ID for optimistic update
			const conversationId = params?.conversationId || generateConversationId();

			// Optimistically add the conversation to the cache
			const optimisticConversation: Conversation = {
				id: conversationId,
				title: undefined,
				createdAt: new Date(),
				updatedAt: new Date(),
				visitorId: "",
				websiteId: "",
				status: "open",
			};

			// Set optimistic data in query cache
			queryClient.setQueryData<Conversation>(
				QUERY_KEYS.conversation(conversationId),
				optimisticConversation
			);

			// Invalidate conversations queries to force refetch
			queryClient.invalidateQueries({ 
				queryKey: QUERY_KEYS.conversations(),
				refetchType: "none" // Don't refetch yet, wait for onSuccess
			});

			return { conversationId };
		},
		onSuccess: (data, variables, context) => {
			// Update the conversation with server data
			queryClient.setQueryData<Conversation>(
				QUERY_KEYS.conversation(data.conversation.id),
				data.conversation
			);

			// Directly update the conversations list cache
			queryClient.setQueryData<ListConversationsResponse>(
				QUERY_KEYS.conversations(),
				(oldData) => {
					console.log("[useCreateConversation] Updating cache:", {
						newConversation: data.conversation,
						newConversationStatus: data.conversation.status,
						oldDataExists: !!oldData,
						oldConversations: oldData?.conversations?.map(c => ({ id: c.id, status: c.status }))
					});
					
					if (!oldData) {
						return {
							conversations: [data.conversation],
							pagination: { hasNextPage: false, nextCursor: null }
						};
					}
					
					// Check if conversation already exists (in case of race conditions)
					const existingIndex = oldData.conversations.findIndex(
						c => c.id === data.conversation.id
					);
					
					let updatedConversations;
					if (existingIndex >= 0) {
						// Update existing conversation
						updatedConversations = [...oldData.conversations];
						updatedConversations[existingIndex] = data.conversation;
					} else {
						// Add new conversation at the beginning (most recent)
						// and limit to 10 conversations to match the API limit
						updatedConversations = [data.conversation, ...oldData.conversations].slice(0, 10);
					}
					
					console.log("[useCreateConversation] Updated conversations:", 
						updatedConversations.map(c => ({ id: c.id, status: c.status }))
					);
					
					return {
						...oldData,
						conversations: updatedConversations
					};
				}
			);

			// Set initial messages if any
			if (data.initialMessages.length > 0) {
				queryClient.setQueryData<PaginatedMessagesCache>(
					QUERY_KEYS.messages(data.conversation.id),
					setInitialMessagesInCache(data.initialMessages)
				);
			}

			// Call user's onSuccess callback
			options?.onSuccess?.(data);
		},
		onError: (error, variables, context) => {
			// Remove optimistic conversation on error
			if (context?.conversationId) {
				queryClient.removeQueries({
					queryKey: QUERY_KEYS.conversation(context.conversationId),
				});

				// Invalidate conversations to refetch the list
				queryClient.invalidateQueries({ 
					queryKey: QUERY_KEYS.conversations()
				});
			}

			// Call user's onError callback
			options?.onError?.(error as Error);
		},
	});
}
