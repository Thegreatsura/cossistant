import { db } from "@api/db";
import { getWebsiteUsageCounts } from "@api/db/queries/usage";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { env } from "@api/env";
import { getPlanForWebsite } from "@api/lib/plans/access";
import { getPlanConfig, type PlanName } from "@api/lib/plans/config";
import { getCustomerByOrganizationId } from "@api/lib/plans/polar";
import polarClient from "@api/lib/polar";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const planRouter = createTRPCRouter({
	getPlanInfo: protectedProcedure
		.input(
			z.object({
				websiteSlug: z.string(),
			})
		)
		.query(async ({ ctx, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(ctx.db, {
				userId: ctx.user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			// Get plan information
			const planInfo = await getPlanForWebsite(websiteData);

			// Get usage counts
			if (!websiteData.teamId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Website must have a team ID",
				});
			}

			const usageCounts = await getWebsiteUsageCounts(db, {
				websiteId: websiteData.id,
				organizationId: websiteData.organizationId,
				teamId: websiteData.teamId,
			});

			return {
				plan: {
					name: planInfo.planName,
					displayName: planInfo.displayName,
					price: planInfo.price,
					features: planInfo.features,
				},
				usage: {
					messages: usageCounts.messages,
					contacts: usageCounts.contacts,
					conversations: usageCounts.conversations,
					teamMembers: usageCounts.teamMembers,
				},
			};
		}),
	createCheckout: protectedProcedure
		.input(
			z.object({
				websiteSlug: z.string(),
				targetPlan: z.enum(["free", "hobby"]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { targetPlan } = input;

			const websiteData = await getWebsiteBySlugWithAccess(ctx.db, {
				userId: ctx.user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			// Get target plan config
			const targetPlanConfig = getPlanConfig(targetPlan as PlanName);

			if (!targetPlanConfig.polarProductId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Plan ${targetPlan} does not have a Polar product ID configured`,
				});
			}

			// Get customer by organization ID (customer should exist from organization creation)
			const customer = await getCustomerByOrganizationId(
				websiteData.organizationId
			);

			if (!customer) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Customer not found. Please contact support.",
				});
			}

			// Create checkout session
			try {
				const baseUrl = env.PUBLIC_APP_URL || "http://localhost:3000";
				const returnPath = `/${input.websiteSlug}/settings/plan`;

				const checkout = await polarClient.checkouts.create({
					products: [targetPlanConfig.polarProductId],
					externalCustomerId: websiteData.organizationId,
					metadata: {
						websiteId: websiteData.id,
					},
					successUrl: `${baseUrl}${returnPath}?checkout_success=true`,
					failureUrl: `${baseUrl}${returnPath}?checkout_error=true`,
				});

				return {
					checkoutUrl: checkout.url,
				};
			} catch (error) {
				console.error("Error creating checkout:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create checkout session",
				});
			}
		}),
});
