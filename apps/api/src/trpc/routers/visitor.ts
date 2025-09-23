import {
	blockVisitor,
	type VisitorRecord,
	unblockVisitor,
} from "@api/db/mutations/visitor";
import { getVisitorComplete } from "@api/db/queries/visitor";
import { blockVisitorResponseSchema } from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { loadConversationContext } from "../utils/conversation";

function normaliseVisitor(record: VisitorRecord) {
	return {
		...record,
		metadata: record.metadata as Record<string, unknown> | null,
		isBlocked: Boolean(record.blockedAt),
	};
}

export const visitorRouter = createTRPCRouter({
	block: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				websiteSlug: z.string(),
			})
		)
		.output(blockVisitorResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			const { conversation } = await loadConversationContext(
				db,
				user.id,
				input
			);

			const visitorRecord = await getVisitorComplete(db, {
				visitorId: conversation.visitorId,
			});

			if (
				!visitorRecord ||
				visitorRecord.websiteId !== conversation.websiteId
			) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Visitor not found",
				});
			}

			const updatedVisitor = await blockVisitor(db, {
				visitor: visitorRecord,
				actorUserId: user.id,
			});

			if (!updatedVisitor) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to block visitor",
				});
			}

			return {
				conversation,
				visitor: normaliseVisitor(updatedVisitor),
			};
		}),

	unblock: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				websiteSlug: z.string(),
			})
		)
		.output(blockVisitorResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			const { conversation } = await loadConversationContext(
				db,
				user.id,
				input
			);

			const visitorRecord = await getVisitorComplete(db, {
				visitorId: conversation.visitorId,
			});

			if (
				!visitorRecord ||
				visitorRecord.websiteId !== conversation.websiteId
			) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Visitor not found",
				});
			}

			const updatedVisitor = await unblockVisitor(db, {
				visitor: visitorRecord,
				actorUserId: user.id,
			});

			if (!updatedVisitor) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Unable to unblock visitor",
				});
			}

			return {
				conversation,
				visitor: normaliseVisitor(updatedVisitor),
			};
		}),
});
