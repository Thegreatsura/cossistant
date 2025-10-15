import { blockVisitor, unblockVisitor } from "@api/db/mutations/visitor";
import { getCompleteVisitorWithContact } from "@api/db/queries/visitor";
import { listOnlineVisitors } from "@api/services/presence";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import {
        blockVisitorResponseSchema,
        listVisitorPresenceResponseSchema,
        type ContactMetadata,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { loadConversationContext } from "../utils/conversation";

export const visitorRouter = createTRPCRouter({
        listOnline: protectedProcedure
                .input(
                        z.object({
                                websiteSlug: z.string(),
                                limit: z
                                        .number()
                                        .min(1)
                                        .max(500)
                                        .optional(),
                        })
                )
                .output(listVisitorPresenceResponseSchema)
                .query(async ({ ctx: { db, user }, input }) => {
                        const websiteData = await getWebsiteBySlugWithAccess(db, {
                                userId: user.id,
                                websiteSlug: input.websiteSlug,
                        });

                        if (!websiteData) {
                                throw new TRPCError({
                                        code: "NOT_FOUND",
                                        message: "Website not found or access denied",
                                });
                        }

                        return await listOnlineVisitors(db, {
                                websiteId: websiteData.id,
                                limit: input.limit,
                        });
                }),

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

			const visitorRecord = await getCompleteVisitorWithContact(db, {
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
				visitor: {
					...updatedVisitor,
					contact: visitorRecord.contact
						? {
								...visitorRecord.contact,
								metadata: visitorRecord.contact.metadata as ContactMetadata,
							}
						: null,
					isBlocked: Boolean(updatedVisitor.blockedAt),
				},
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

			const visitorRecord = await getCompleteVisitorWithContact(db, {
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
				visitor: {
					...updatedVisitor,
					contact: visitorRecord.contact
						? {
								...visitorRecord.contact,
								metadata: visitorRecord.contact.metadata as ContactMetadata,
							}
						: null,
					isBlocked: Boolean(updatedVisitor.blockedAt),
				},
			};
		}),
});
