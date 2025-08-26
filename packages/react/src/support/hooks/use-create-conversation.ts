import type { CossistantClient, CossistantRestClient } from "@cossistant/core";
import { generateConversationId } from "@cossistant/core";
import type {
	CreateConversationRequestBody,
	CreateConversationResponseBody,
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
				["conversation", conversationId],
				optimisticConversation
			);

			// Invalidate conversations queries to force refetch
			queryClient.invalidateQueries({ 
				queryKey: ["conversations"],
				refetchType: "none" // Don't refetch yet, wait for onSuccess
			});

			return { conversationId };
		},
		onSuccess: (data, variables, context) => {
			// Update the conversation with server data
			queryClient.setQueryData<Conversation>(
				["conversation", data.conversation.id],
				data.conversation
			);

			// Invalidate and refetch conversations list to ensure it's up to date
			// This will trigger useConversations to refetch with the correct query key
			queryClient.invalidateQueries({ 
				queryKey: ["conversations"],
				refetchType: "active" // Refetch active queries
			});

			// Set initial messages if any
			if (data.initialMessages.length > 0) {
				queryClient.setQueryData<PaginatedMessagesCache>(
					["messages", data.conversation.id],
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
					queryKey: ["conversation", context.conversationId],
				});

				// Invalidate conversations to refetch the list
				queryClient.invalidateQueries({ 
					queryKey: ["conversations"] 
				});
			}

			// Call user's onError callback
			options?.onError?.(error as Error);
		},
	});
}
