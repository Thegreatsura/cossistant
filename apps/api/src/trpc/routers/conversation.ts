import { listConversationsByWebsite } from "@api/db/queries/conversation";
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
      // First get the website to verify it exists and get its organizationId
      const [websiteData] = await db.query.website.findMany({
        where: (website, { eq, and, isNull }) =>
          and(eq(website.id, input.websiteId), isNull(website.deletedAt)),
        limit: 1,
      });

      if (!websiteData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      // Check if user has access to this website (either org admin/owner or team member)
      const hasOrgAccess = await db.query.member.findFirst({
        where: (member, { eq, and, inArray }) =>
          and(
            eq(member.userId, user.id),
            eq(member.organizationId, websiteData.organizationId),
            inArray(member.role, ["owner", "admin"])
          ),
      });

      if (hasOrgAccess) {
        // User has org-level access, proceed
      } else if (websiteData.teamId) {
        // Check team-level access
        const teamAccess = await db.query.teamMember.findFirst({
          where: (teamMember, { eq, and }) =>
            and(
              eq(teamMember.userId, user.id),
              eq(teamMember.teamId, websiteData.teamId)
            ),
        });

        if (!teamAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied to this website",
          });
        }
      } else {
        // No org access and no team to check
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this website",
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
