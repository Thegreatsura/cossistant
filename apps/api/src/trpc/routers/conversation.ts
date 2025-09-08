import { listConversationsHeaders } from "@api/db/queries/conversation";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { messageSchema, visitorProfileSchema } from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const conversationRouter = createTRPCRouter({
  listConversationsHeaders: protectedProcedure
    .input(
      z.object({
        websiteSlug: z.string(),
        limit: z.number().int().min(1).max(500).optional(),
        cursor: z.string().nullable().optional(),
      })
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            status: z.string(),
            priority: z.string(),
            organizationId: z.string(),
            visitorId: z.string(),
            visitor: visitorProfileSchema,
            websiteId: z.string(),
            channel: z.string(),
            title: z.string().nullable(),
            resolutionTime: z.number().nullable(),
            startedAt: z.date().nullable(),
            firstResponseAt: z.date().nullable(),
            resolvedAt: z.date().nullable(),
            resolvedByUserId: z.string().nullable(),
            resolvedByAiAgentId: z.string().nullable(),
            createdAt: z.date(),
            updatedAt: z.date(),
            deletedAt: z.date().nullable(),
            lastMessageAt: z.date().nullable(),
            lastMessagePreview: messageSchema.nullable(),
          })
        ),
        nextCursor: z.string().nullable(),
      })
    )
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

      // Fetch conversations for the website
      const result = await listConversationsHeaders(db, {
        organizationId: websiteData.organizationId,
        websiteId: websiteData.id,
        limit: input.limit,
        cursor: input.cursor,
      });

      return {
        items: result.items,
        nextCursor: result.nextCursor,
      };
    }),
});
