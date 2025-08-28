import type { CossistantClient, CossistantRestClient } from "@cossistant/core";
import { generateConversationId, generateMessageId } from "@cossistant/core";
import { MessageType, MessageVisibility } from "@cossistant/types";
import type { CreateConversationResponseBody, ListConversationsResponse } from "@cossistant/types/api/conversation";
import type { GetMessagesResponse } from "@cossistant/types/api/message";
import type { Conversation, Message } from "@cossistant/types/schemas";
import {
	type InfiniteData,
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { QUERY_KEYS } from "../utils/query-keys";

export interface SendMessageOptions {
	conversationId?: string | null;
	message: string;
	files?: File[];
	defaultMessages?: Message[];
	visitorId?: string;
	onSuccess?: (conversationId: string, messageId: string) => void;
	onError?: (error: Error) => void;
}

interface SendMessageResult {
	conversationId: string;
	messageId: string;
	conversation?: CreateConversationResponseBody["conversation"];
	initialMessages?: CreateConversationResponseBody["initialMessages"];
}

interface OptimisticContext {
	optimisticConversationId: string;
	optimisticMessageId: string;
	wasNewConversation: boolean;
}

// Helper function to create a new message
function createMessage(
	id: string,
	content: string,
	conversationId: string,
	visitorId?: string
): Message {
	const now = new Date();
	return {
		id,
		bodyMd: content,
		type: MessageType.TEXT,
		userId: null,
		aiAgentId: null,
		visitorId: visitorId || null,
		conversationId,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		visibility: MessageVisibility.PUBLIC,
	};
}

// Helper function to handle optimistic update for existing conversation
function addOptimisticMessage(
	queryClient: QueryClient,
	conversationId: string,
	message: Message
): void {
	queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
		QUERY_KEYS.messages(conversationId),
		(old) => {
			if (!old) {
				return {
					pages: [
						{
							messages: [message],
							nextCursor: undefined,
							hasNextPage: false,
						},
					],
					pageParams: [undefined],
				};
			}

			// Add message to the last page
			const newPages = [...old.pages];
			const lastPageIndex = newPages.length - 1;

			if (lastPageIndex >= 0) {
				newPages[lastPageIndex] = {
					...newPages[lastPageIndex],
					messages: [...(newPages[lastPageIndex]?.messages || []), message],
					hasNextPage: newPages[lastPageIndex]?.hasNextPage ?? false,
				};
			}

			return {
				...old,
				pages: newPages,
			};
		}
	);
}

// Helper function to rollback optimistic updates
function rollbackOptimisticUpdates(
	queryClient: QueryClient,
	context: OptimisticContext,
	defaultMessages: Message[] = []
): void {
	if (context.wasNewConversation) {
		// Reset pending conversation messages to default
		queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
			QUERY_KEYS.messages(PENDING_CONVERSATION_ID),
			{
				pages: [
					{
						messages: defaultMessages,
						nextCursor: undefined,
						hasNextPage: false,
					},
				],
				pageParams: [undefined],
			}
		);
	} else {
		// Remove just the optimistic message
		queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
			QUERY_KEYS.messages(context.optimisticConversationId),
			(old) => {
				if (!old) {
					return old;
				}

				const newPages = old.pages.map((page) => ({
					...page,
					messages: page.messages.filter(
						(m) => m.id !== context.optimisticMessageId
					),
				}));

				return {
					...old,
					pages: newPages,
				};
			}
		);
	}
}

// Helper function to update with server data after successful creation
function updateWithServerData(
	queryClient: QueryClient,
	data: SendMessageResult,
	context: OptimisticContext
): void {
	if (context.wasNewConversation && data.conversation) {
		// Update conversation with server data
		queryClient.setQueryData<Conversation>(
			QUERY_KEYS.conversation(data.conversationId),
			data.conversation
		);

		// Don't manually update conversations list - let invalidation handle it
		// This ensures the list stays in sync with the server

		// Update messages with the actual messages from the server
		if (data.initialMessages) {
			queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
				QUERY_KEYS.messages(data.conversationId),
				{
					pages: [
						{
							messages: data.initialMessages,
							nextCursor: undefined,
							hasNextPage: false,
						},
					],
					pageParams: [undefined],
				}
			);
		}
	} else {
		// For existing conversations, we need to replace the optimistic message with the server response
		// The server response might have different IDs or timestamps
		queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
			QUERY_KEYS.messages(data.conversationId),
			(old) => {
				if (!old) {
					return old;
				}

				// Find and replace the optimistic message with the real one
				const newPages = old.pages.map((page) => ({
					...page,
					messages: page.messages.map((msg) =>
						msg.id === context.optimisticMessageId
							? { ...msg, id: data.messageId } // Update with server ID
							: msg
					),
				}));

				return {
					...old,
					pages: newPages,
				};
			}
		);

		// Then invalidate to ensure we have the latest data
		queryClient.invalidateQueries({
			queryKey: QUERY_KEYS.messages(data.conversationId),
		});
	}
}

export function useSendMessage(
	client: CossistantClient | CossistantRestClient | null
) {
	const queryClient = useQueryClient();

	return useMutation<
		SendMessageResult,
		Error,
		SendMessageOptions,
		OptimisticContext
	>({
		mutationFn: async ({
			conversationId,
			message,
			files = [],
			defaultMessages = [],
			visitorId,
		}) => {
			if (!client) {
				throw new Error("No client available");
			}

			// If no conversation exists, create one with the initial messages
			if (!conversationId) {
				const newConversationId = generateConversationId();
				const userMessageId = generateMessageId();

				// Create user message
				const userMessage = createMessage(
					userMessageId,
					message,
					newConversationId,
					visitorId
				);

				// Combine default messages with the user's message
				const allMessages: Message[] = [...defaultMessages, userMessage];

				const response = await client.createConversation({
					conversationId: newConversationId,
					defaultMessages: allMessages,
				});

				return {
					conversationId: response.conversation.id,
					messageId: userMessageId,
					conversation: response.conversation,
					initialMessages: response.initialMessages,
				};
			}

			// For existing conversation, send the message
			const messageId = generateMessageId();

			// Create the message object
			const messageData = {
				id: messageId,
				bodyMd: message,
				type: MessageType.TEXT as "text",
				visitorId: visitorId || null,
				userId: null,
				aiAgentId: null,
				visibility: MessageVisibility.PUBLIC as "public",
			};

			// Send the message using the client
			const response = await client.sendMessage({
				conversationId,
				message: messageData,
			});

			return {
				conversationId,
				messageId: response.message.id,
			};
		},
		onMutate: async ({
			conversationId,
			message,
			defaultMessages = [],
			visitorId,
		}) => {
			// Generate IDs for optimistic updates
			const optimisticConversationId =
				conversationId || generateConversationId();
			const optimisticMessageId = generateMessageId();

			if (conversationId) {
				// Just add the new message to existing conversation
				const newMessage = createMessage(
					optimisticMessageId,
					message,
					conversationId,
					visitorId
				);

				addOptimisticMessage(queryClient, conversationId, newMessage);
			} else {
				// For pending conversations, we just update the pending messages optimistically
				// We don't create the actual conversation until we get server response
				const userMessage = createMessage(
					optimisticMessageId,
					message,
					optimisticConversationId,
					visitorId
				);

				// Update the pending conversation messages
				const allMessages: Message[] = [...defaultMessages, userMessage];
				queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
					QUERY_KEYS.messages(PENDING_CONVERSATION_ID),
					{
						pages: [
							{
								messages: allMessages,
								nextCursor: undefined,
								hasNextPage: false,
							},
						],
						pageParams: [undefined],
					}
				);
			}

			return {
				optimisticConversationId,
				optimisticMessageId,
				wasNewConversation: !conversationId,
			};
		},
		onSuccess: (data, variables, context) => {
			// Only update if we have valid context
			if (!context) {
				variables.onSuccess?.(data.conversationId, data.messageId);
				return;
			}

			// Update with server data
			updateWithServerData(queryClient, data, context);
			
			// If we created a new conversation, update the conversations list
			if (context.wasNewConversation && data.conversation) {
				console.log("[useSendMessage] New conversation created:", {
					id: data.conversation.id,
					status: data.conversation.status
				});
				
				// Directly update the conversations list cache
				queryClient.setQueryData<ListConversationsResponse>(
					QUERY_KEYS.conversations(),
					(oldData) => {
						console.log("[useSendMessage] Updating cache, old data:", oldData?.conversations?.map(c => ({ 
							id: c.id, 
							status: c.status 
						})));
						
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
						
						console.log("[useSendMessage] Updated conversations:", 
							updatedConversations.map(c => ({ id: c.id, status: c.status }))
						);
						
						return {
							...oldData,
							conversations: updatedConversations
						};
					}
				);
			}

			// Call user's success callback
			variables.onSuccess?.(data.conversationId, data.messageId);
		},
		onError: (error, variables, context) => {
			// Only rollback if we have valid context
			if (context) {
				rollbackOptimisticUpdates(
					queryClient,
					context,
					variables.defaultMessages
				);
			}

			// Call user's error callback
			variables.onError?.(error);
		},
	});
}
