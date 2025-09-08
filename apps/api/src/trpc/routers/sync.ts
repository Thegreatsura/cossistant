import { fetchSyncData } from "@api/db/queries/sync";
import { getWebsiteByIdWithAccess } from "@api/db/queries/website";
import { syncRequestSchema, syncResponseSchema } from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

// Extended sync request schema with page parameter
const syncMasterRequestSchema = syncRequestSchema.extend({
  page: z.number().int().min(0).default(0),
});

export const syncRouter = createTRPCRouter({
  sync: protectedProcedure
    .input(syncMasterRequestSchema)
    .output(syncResponseSchema)
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

      // Fetch sync data using the dedicated query
      const syncData = await fetchSyncData(db, {
        websiteId: input.websiteId,
        organizationId: websiteData.organizationId,
        cursor: input.cursor,
        limit: input.limit,
        page: input.page,
      });

      return syncData;
    }),
});
