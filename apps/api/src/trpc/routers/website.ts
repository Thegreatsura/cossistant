import { createDefaultWebsiteKeys } from "@api/db/queries/api-keys";
import { createDefaultWebsiteViews } from "@api/db/queries/view";
import {
	createWebsite,
	getWebsiteBySlugWithAccess,
} from "@api/db/queries/website";
import { website } from "@api/db/schema";
import { domainToSlug } from "@api/utils/domain-slug";
import {
	checkWebsiteDomainRequestSchema,
	createWebsiteRequestSchema,
	createWebsiteResponseSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const websiteRouter = createTRPCRouter({
	getBySlug: protectedProcedure
		.input(z.object({ slug: z.string() }))
		.query(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.slug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			return websiteData;
		}),
	create: protectedProcedure
		.input(createWebsiteRequestSchema)
		.output(createWebsiteResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			// Check if website with same verified domain already exists
			const existingDomainWebsite = await db.query.website.findFirst({
				where: and(
					eq(website.domain, input.domain),
					eq(website.isDomainOwnershipVerified, true),
				),
			});

			if (existingDomainWebsite) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Domain already in use by another website",
				});
			}

			const userEmailDomain = user.email.split("@")[1];
			const isDomainOwnershipVerified = userEmailDomain === input.domain;

			// Generate a unique slug by always adding a random suffix
			const slug = domainToSlug(input.domain);

			const createdWebsite = await createWebsite(db, {
				organizationId: input.organizationId,
				data: {
					name: input.name,
					installationTarget: input.installationTarget,
					domain: input.domain,
					isDomainOwnershipVerified,
					whitelistedDomains: [
						`https://${input.domain}`,
						"http://localhost:3000",
					],
					slug,
				},
			});

			const [apiKeys] = await Promise.all([
				createDefaultWebsiteKeys(db, {
					websiteId: createdWebsite.id,
					websiteName: input.name,
					organizationId: input.organizationId,
					createdBy: user.id,
				}),
				createDefaultWebsiteViews(db, {
					websiteId: createdWebsite.id,
					websiteName: input.name,
					organizationId: input.organizationId,
					createdBy: user.id,
				}),
			]);

			return {
				id: createdWebsite.id,
				name: createdWebsite.name,
				whitelistedDomains: createdWebsite.whitelistedDomains,
				organizationId: createdWebsite.organizationId,
				apiKeys: apiKeys.map((key) => ({
					id: key.id,
					key: key.key,
					createdAt: key.createdAt,
					isTest: key.isTest,
					isActive: key.isActive,
					keyType: key.keyType,
				})),
			};
		}),
	checkDomain: protectedProcedure
		.input(checkWebsiteDomainRequestSchema)
		.output(z.boolean())
		.query(async ({ ctx: { db }, input }) => {
			const existingWebsite = await db.query.website.findFirst({
				where: and(
					eq(website.domain, input.domain),
					eq(website.isDomainOwnershipVerified, true),
				),
			});

			return !!existingWebsite;
		}),
});
