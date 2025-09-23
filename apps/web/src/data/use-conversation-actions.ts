"use client";

import type {
	OrigamiTRPCRouter,
	RouterInputs,
	RouterOutputs,
} from "@api/trpc/types";
import { ConversationStatus } from "@cossistant/types";
import {
	type InfiniteData,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useCallback, useMemo } from "react";
import { useUserSession, useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import {
	type ConversationHeader,
	createConversationHeadersInfiniteQueryKey,
	updateConversationHeaderInCache,
} from "./conversation-header-cache";

type ConversationHeadersPage =
	RouterOutputs["conversation"]["listConversationsHeaders"];
type ConversationMutationResponse =
	RouterOutputs["conversation"]["markResolved"];
type BlockVisitorResponse = RouterOutputs["visitor"]["block"];

type BaseConversationMutationVariables =
	RouterInputs["conversation"]["markResolved"];
type MarkReadVariables = RouterInputs["conversation"]["markRead"];
type MarkUnreadVariables = RouterInputs["conversation"]["markUnread"];
type BlockVisitorVariables = RouterInputs["visitor"]["block"];

type TRPCError = TRPCClientErrorLike<OrigamiTRPCRouter>;

type MutationContext = {
	previousHeaders?: InfiniteData<ConversationHeadersPage>;
	visitorQueryKey?: readonly unknown[] | null;
	previousVisitor?: RouterOutputs["conversation"]["getVisitorById"] | null;
};

type UseConversationActionsParams = {
	conversationId: string;
	visitorId?: string | null;
};

type UseConversationActionsReturn = {
	markResolved: () => Promise<ConversationMutationResponse>;
	markSpam: () => Promise<ConversationMutationResponse>;
	markArchived: () => Promise<ConversationMutationResponse>;
	markRead: () => Promise<ConversationMutationResponse>;
	markUnread: () => Promise<ConversationMutationResponse>;
	blockVisitor: () => Promise<BlockVisitorResponse>;
	isAnyPending: boolean;
	pendingAction: {
		markResolved: boolean;
		markSpam: boolean;
		markArchived: boolean;
		markRead: boolean;
		markUnread: boolean;
		blockVisitor: boolean;
	};
};

function mergeWithServerConversation(
	existing: ConversationHeader,
	server: ConversationMutationResponse["conversation"]
): ConversationHeader {
	return {
		...existing,
		...server,
	};
}

function computeResolutionTime(
	existing: ConversationHeader,
	now: Date
): number | null {
	if (!existing.startedAt) {
		return existing.resolutionTime ?? null;
	}

	const diffSeconds = Math.max(
		0,
		Math.round((now.getTime() - existing.startedAt.getTime()) / 1000)
	);

	return diffSeconds;
}

export function useConversationActions({
	conversationId,
	visitorId,
}: UseConversationActionsParams): UseConversationActionsReturn {
	const trpc = useTRPC();
	const website = useWebsite();
	const { user } = useUserSession();
	const queryClient = useQueryClient();

	const effectiveVisitorId = visitorId ?? null;

	const headersQueryKey = useMemo(
		() =>
			createConversationHeadersInfiniteQueryKey(
				trpc.conversation.listConversationsHeaders.queryOptions({
					websiteSlug: website.slug,
				}).queryKey
			),
		[trpc, website.slug]
	);

	const prepareContext = useCallback(async (): Promise<MutationContext> => {
		await queryClient.cancelQueries({ queryKey: headersQueryKey });

		return {
			previousHeaders:
				queryClient.getQueryData<InfiniteData<ConversationHeadersPage>>(
					headersQueryKey
				),
		};
	}, [headersQueryKey, queryClient]);

	const restoreContext = useCallback(
		(context?: MutationContext) => {
			if (context?.previousHeaders) {
				queryClient.setQueryData(headersQueryKey, context.previousHeaders);
			}

			if (context?.visitorQueryKey) {
				queryClient.setQueryData(
					context.visitorQueryKey,
					context.previousVisitor ?? null
				);
			}
		},
		[headersQueryKey, queryClient]
	);

	const applyOptimisticUpdate = useCallback(
		(updater: (conversation: ConversationHeader) => ConversationHeader) => {
			updateConversationHeaderInCache(
				queryClient,
				headersQueryKey,
				conversationId,
				updater
			);
		},
		[conversationId, headersQueryKey, queryClient]
	);

	const markResolvedMutation = useMutation<
		ConversationMutationResponse,
		TRPCError,
		BaseConversationMutationVariables,
		MutationContext
	>({
		...trpc.conversation.markResolved.mutationOptions(),
		onMutate: async () => {
			const context = await prepareContext();
			const now = new Date();

			applyOptimisticUpdate((existing) => ({
				...existing,
				status: ConversationStatus.RESOLVED,
				resolvedAt: now,
				resolvedByUserId: user.id,
				resolvedByAiAgentId: null,
				resolutionTime: computeResolutionTime(existing, now),
				updatedAt: now,
			}));

			return context;
		},
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: (data) => {
			applyOptimisticUpdate((existing) =>
				mergeWithServerConversation(existing, data.conversation)
			);
		},
	});

	const markSpamMutation = useMutation<
		ConversationMutationResponse,
		TRPCError,
		BaseConversationMutationVariables,
		MutationContext
	>({
		...trpc.conversation.markSpam.mutationOptions(),
		onMutate: async () => {
			const context = await prepareContext();
			const now = new Date();

			applyOptimisticUpdate((existing) => ({
				...existing,
				status: ConversationStatus.SPAM,
				resolvedAt: null,
				resolvedByUserId: null,
				resolvedByAiAgentId: null,
				updatedAt: now,
			}));

			return context;
		},
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: (data) => {
			applyOptimisticUpdate((existing) =>
				mergeWithServerConversation(existing, data.conversation)
			);
		},
	});

	const markArchivedMutation = useMutation<
		ConversationMutationResponse,
		TRPCError,
		BaseConversationMutationVariables,
		MutationContext
	>({
		...trpc.conversation.markArchived.mutationOptions(),
		onMutate: async () => {
			const context = await prepareContext();
			const now = new Date();

			applyOptimisticUpdate((existing) => ({
				...existing,
				deletedAt: now,
				updatedAt: now,
			}));

			return context;
		},
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: (data) => {
			applyOptimisticUpdate((existing) =>
				mergeWithServerConversation(existing, data.conversation)
			);
		},
	});

	const markReadMutation = useMutation<
		ConversationMutationResponse,
		TRPCError,
		MarkReadVariables,
		MutationContext
	>({
		...trpc.conversation.markRead.mutationOptions(),
		onMutate: async () => prepareContext(),
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: headersQueryKey });
		},
	});

	const markUnreadMutation = useMutation<
		ConversationMutationResponse,
		TRPCError,
		MarkUnreadVariables,
		MutationContext
	>({
		...trpc.conversation.markUnread.mutationOptions(),
		onMutate: async () => prepareContext(),
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: headersQueryKey });
		},
	});

	const blockVisitorMutation = useMutation<
		BlockVisitorResponse,
		TRPCError,
		BlockVisitorVariables,
		MutationContext
	>({
		...trpc.visitor.block.mutationOptions(),
		onMutate: async () => {
			const context = await prepareContext();

			if (effectiveVisitorId) {
				const visitorQueryKey = trpc.conversation.getVisitorById.queryOptions({
					websiteSlug: website.slug,
					visitorId: effectiveVisitorId,
				}).queryKey;

				context.visitorQueryKey = visitorQueryKey;
				context.previousVisitor =
					queryClient.getQueryData(visitorQueryKey) ?? null;

				queryClient.setQueryData(visitorQueryKey, (existing) => {
					const blockedAt = new Date();

					if (!existing) {
						return existing;
					}

					return {
						...existing,
						blockedAt,
						blockedByUserId: user.id,
						updatedAt: blockedAt,
					};
				});
			}

			return context;
		},
		onError: (_error, _variables, context) => {
			restoreContext(context);
		},
		onSuccess: (data, _variables, context) => {
			applyOptimisticUpdate((existing) =>
				mergeWithServerConversation(existing, data.conversation)
			);

			if (context?.visitorQueryKey) {
				queryClient.setQueryData(context.visitorQueryKey, data.visitor);
			}
		},
	});

	const markResolved = useCallback(
		() =>
			markResolvedMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[conversationId, markResolvedMutation, website.slug]
	);

	const markSpam = useCallback(
		() =>
			markSpamMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[conversationId, markSpamMutation, website.slug]
	);

	const markArchived = useCallback(
		() =>
			markArchivedMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[conversationId, markArchivedMutation, website.slug]
	);

	const markRead = useCallback(
		() =>
			markReadMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[conversationId, markReadMutation, website.slug]
	);

	const markUnread = useCallback(
		() =>
			markUnreadMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[conversationId, markUnreadMutation, website.slug]
	);

	const blockVisitor = useCallback(
		() =>
			blockVisitorMutation.mutateAsync({
				conversationId,
				websiteSlug: website.slug,
			}),
		[blockVisitorMutation, conversationId, website.slug]
	);

	return {
		markResolved,
		markSpam,
		markArchived,
		markRead,
		markUnread,
		blockVisitor,
		isAnyPending:
			markResolvedMutation.isPending ||
			markSpamMutation.isPending ||
			markArchivedMutation.isPending ||
			markReadMutation.isPending ||
			markUnreadMutation.isPending ||
			blockVisitorMutation.isPending,
		pendingAction: {
			markResolved: markResolvedMutation.isPending,
			markSpam: markSpamMutation.isPending,
			markArchived: markArchivedMutation.isPending,
			markRead: markReadMutation.isPending,
			markUnread: markUnreadMutation.isPending,
			blockVisitor: blockVisitorMutation.isPending,
		},
	};
}
