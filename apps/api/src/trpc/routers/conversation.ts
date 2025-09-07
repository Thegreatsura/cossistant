import { listConversationsByWebsite } from "@api/db/queries/conversation";
import { getWebsiteByIdWithAccess } from "@api/db/queries/website";
import { ConversationStatus } from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const conversationRouter = createTRPCRouter({
  listByWebsite: protectedProcedure
    .input(
      z.object({
        websiteId: z.string().ulid(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().nullable().optional(),
        status: z.nativeEnum(ConversationStatus).optional(),
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
            lastMessagePreview: z.string().nullable(),
          })
        ),
        nextCursor: z.string().nullable(),
      })
    )
    .query(async ({ ctx: { db, user }, input }) => {
      const websiteData = await getWebsiteByIdWithAccess(db, {
        userId: user.id,
        websiteId: input.websiteId,
      });

      if (!websiteData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found or access denied",
        });
      }

      // Fetch conversations for the website
      const result = await listConversationsByWebsite(db, {
        organizationId: websiteData.organizationId,
        websiteId: input.websiteId,
        limit: input.limit,
        cursor: input.cursor,
        status: input.status,
      });

      return {
        items: result.items,
        nextCursor: result.nextCursor,
      };
    }),
});
