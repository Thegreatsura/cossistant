"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ulid } from "ulid";
import {
	type ConversationTimelineItem,
	createConversationTimelineItemsInfiniteQueryKey,
	removeConversationTimelineItemFromCache,
	upsertConversationTimelineItemInCache,
} from "@/data/conversation-message-cache";
import { useTRPC } from "@/lib/trpc/client";

type SubmitPayload = {
	message: string;
	files: File[];
};

type UseSendConversationMessageOptions = {
	conversationId: string;
	websiteSlug: string;
	currentUserId: string;
	pageLimit?: number;
};

type UseSendConversationMessageReturn = {
	submit: (payload: SubmitPayload) => Promise<void>;
	isPending: boolean;
};

const DEFAULT_PAGE_LIMIT = 50;

export function useSendConversationMessage({
	conversationId,
	websiteSlug,
	currentUserId,
	pageLimit = DEFAULT_PAGE_LIMIT,
}: UseSendConversationMessageOptions): UseSendConversationMessageReturn {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const timelineItemsQueryKey = useMemo(
		() =>
			createConversationTimelineItemsInfiniteQueryKey(
				trpc.conversation.getConversationTimelineItems.queryOptions({
					conversationId,
					websiteSlug,
					limit: pageLimit,
				}).queryKey
			),
		[conversationId, pageLimit, trpc, websiteSlug]
	);

	const { mutateAsync: sendMessage, isPending } = useMutation(
		trpc.conversation.sendMessage.mutationOptions()
	);

	const submit = useCallback(
		async ({ message, files }: SubmitPayload) => {
			const trimmedMessage = message.trim();

			if (!trimmedMessage) {
				return;
			}

			if (files.length > 0) {
				throw new Error("File attachments are not supported yet.");
			}

			const timelineItemId = ulid();
			const timestamp = new Date().toISOString();

			const optimisticItem: ConversationTimelineItem = {
				id: timelineItemId,
				conversationId,
				organizationId: "", // Will be set by backend
				type: "message",
				text: trimmedMessage,
				parts: [{ type: "text", text: trimmedMessage }],
				visibility: "public",
				userId: currentUserId,
				aiAgentId: null,
				visitorId: null,
				createdAt: timestamp,
				deletedAt: null,
			};

			await queryClient.cancelQueries({ queryKey: timelineItemsQueryKey });

			upsertConversationTimelineItemInCache(
				queryClient,
				timelineItemsQueryKey,
				optimisticItem
			);

			try {
				const response = await sendMessage({
					conversationId,
					websiteSlug,
					text: trimmedMessage,
					visibility: "public",
					timelineItemId,
				});

				const { item: createdItem } = response;

				upsertConversationTimelineItemInCache(
					queryClient,
					timelineItemsQueryKey,
					{
						...createdItem,
						parts: createdItem.parts as ConversationTimelineItem["parts"],
					}
				);
			} catch (error) {
				removeConversationTimelineItemFromCache(
					queryClient,
					timelineItemsQueryKey,
					timelineItemId
				);

				throw error;
			}
		},
		[
			conversationId,
			currentUserId,
			timelineItemsQueryKey,
			queryClient,
			sendMessage,
			websiteSlug,
		]
	);

	return {
		submit,
		isPending,
	};
}
