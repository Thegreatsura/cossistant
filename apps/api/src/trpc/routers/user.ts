import { getWebsiteBySlugWithAccess } from "@api/db/queries";
import { getWebsiteMembers } from "@api/db/queries/member";
import { userResponseSchema } from "@cossistant/types";
import { z } from "@hono/zod-openapi";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx: { db, session, user } }) => {
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return user;
  }),
  getWebsiteMembers: protectedProcedure
    .input(
      z.object({
        websiteSlug: z.string(),
      }),
    )
    .output(z.array(userResponseSchema))
    .query(async ({ ctx: { db, user }, input }) => {
      const websiteData = await getWebsiteBySlugWithAccess(db, {
        userId: user.id,
        websiteSlug: input.websiteSlug,
      });

      if (!websiteData) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const members = await getWebsiteMembers(db, {
        organizationId: websiteData.organizationId,
        websiteTeamId: websiteData.teamId,
      });

      return members;
    }),
});
