import type { Database } from "@api/db";
import {
	getMemberNotificationSettings,
	updateMemberNotificationSettings,
} from "@api/db/queries";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { member } from "@api/db/schema";
import {
	memberNotificationSettingsResponseSchema,
	updateMemberNotificationSettingsRequestSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../init";

async function getMemberForOrganization(
	db: Database,
	params: { userId: string; organizationId: string }
) {
	const membership = await db.query.member.findFirst({
		where: and(
			eq(member.userId, params.userId),
			eq(member.organizationId, params.organizationId)
		),
	});

	if (!membership) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You are not a member of this organization.",
		});
	}

	return membership;
}

export const notificationRouter = createTRPCRouter({
	getMemberSettings: protectedProcedure
		.input(z.object({ websiteSlug: z.string() }))
		.output(memberNotificationSettingsResponseSchema)
		.query(async ({ ctx, input }) => {
			const website = await getWebsiteBySlugWithAccess(ctx.db, {
				userId: ctx.user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!website) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const membership = await getMemberForOrganization(ctx.db, {
				userId: ctx.user.id,
				organizationId: website.organizationId,
			});

			return getMemberNotificationSettings(ctx.db, {
				organizationId: website.organizationId,
				memberId: membership.id,
			});
		}),
	updateMemberSettings: protectedProcedure
		.input(updateMemberNotificationSettingsRequestSchema)
		.output(memberNotificationSettingsResponseSchema)
		.mutation(async ({ ctx, input }) => {
			const website = await getWebsiteBySlugWithAccess(ctx.db, {
				userId: ctx.user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!website) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}

			const membership = await getMemberForOrganization(ctx.db, {
				userId: ctx.user.id,
				organizationId: website.organizationId,
			});

			return updateMemberNotificationSettings(ctx.db, {
				organizationId: website.organizationId,
				memberId: membership.id,
				settings: input.settings,
			});
		}),
});
