import { blockVisitor, unblockVisitor } from "@api/db/mutations/visitor";
import { getCompleteVisitorWithContact } from "@api/db/queries/visitor";
import {
  blockVisitorResponseSchema,
  type ContactMetadata,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { loadConversationContext } from "../utils/conversation";

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
