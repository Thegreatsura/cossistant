import { listKnowledge } from "@api/db/queries/knowledge";
import {
	createLinkSource,
	deleteLinkSource,
	getLinkSourceById,
	getLinkSourceByUrl,
	getLinkSourceCount,
	getLinkSourceTotalSize,
	listLinkSources,
	updateLinkSource,
} from "@api/db/queries/link-source";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { knowledge } from "@api/db/schema/knowledge";
import { getPlanForWebsite } from "@api/lib/plans/access";
import { firecrawlService } from "@api/services/firecrawl";
import { cancelWebCrawl, triggerWebCrawl } from "@api/utils/queue-triggers";
import {
	cancelLinkSourceRequestSchema,
	createLinkSourceRequestSchema,
	deleteLinkSourceRequestSchema,
	getCrawlStatusRequestSchema,
	getLinkSourceRequestSchema,
	getTrainingStatsRequestSchema,
	type LinkSourceResponse,
	linkSourceResponseSchema,
	listLinkSourcesRequestSchema,
	listLinkSourcesResponseSchema,
	recrawlLinkSourceRequestSchema,
	trainingStatsResponseSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";

function toLinkSourceResponse(entry: {
	id: string;
	organizationId: string;
	websiteId: string;
	aiAgentId: string | null;
	url: string;
	status: "pending" | "crawling" | "completed" | "failed";
	firecrawlJobId: string | null;
	crawledPagesCount: number;
	totalSizeBytes: number;
	lastCrawledAt: string | null;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}): LinkSourceResponse {
	return {
		id: entry.id,
		organizationId: entry.organizationId,
		websiteId: entry.websiteId,
		aiAgentId: entry.aiAgentId,
		url: entry.url,
		status: entry.status,
		firecrawlJobId: entry.firecrawlJobId,
		crawledPagesCount: entry.crawledPagesCount,
		totalSizeBytes: entry.totalSizeBytes,
		lastCrawledAt: entry.lastCrawledAt,
		errorMessage: entry.errorMessage,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		deletedAt: entry.deletedAt,
	};
}

// Convert MB to bytes
const MB_TO_BYTES = 1024 * 1024;

/**
 * Helper to convert FeatureValue to a number limit
 * Returns null for unlimited (null or boolean true)
 * Returns 0 for disabled (boolean false)
 * Returns the number for numeric limits
 */
function toNumericLimit(value: number | boolean | null): number | null {
	if (value === null || value === true) {
		return null; // unlimited
	}
	if (value === false) {
		return 0; // disabled
	}
	return value; // numeric limit
}

export const linkSourceRouter = createTRPCRouter({
	/**
	 * List link sources with filters and pagination
	 */
	list: protectedProcedure
		.input(listLinkSourcesRequestSchema)
		.output(listLinkSourcesResponseSchema)
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

			const result = await listLinkSources(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId,
				status: input.status,
				page: input.page,
				limit: input.limit,
			});

			return {
				items: result.items.map(toLinkSourceResponse),
				pagination: result.pagination,
			};
		}),

	/**
	 * Get a single link source by ID
	 */
	get: protectedProcedure
		.input(getLinkSourceRequestSchema)
		.output(linkSourceResponseSchema.nullable())
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

			const entry = await getLinkSourceById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!entry) {
				return null;
			}

			return toLinkSourceResponse(entry);
		}),

	/**
	 * Create a new link source and trigger crawl via worker
	 */
	create: protectedProcedure
		.input(createLinkSourceRequestSchema)
		.output(linkSourceResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
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

			// Check if this URL already exists
			const existingSource = await getLinkSourceByUrl(db, {
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? null,
				url: input.url,
			});

			if (existingSource) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "This URL has already been added as a source",
				});
			}

			// Check plan limits
			const planInfo = await getPlanForWebsite(websiteData);
			const linkLimit = toNumericLimit(
				planInfo.features["ai-agent-training-links"]
			);

			if (linkLimit !== null) {
				const currentCount = await getLinkSourceCount(db, {
					websiteId: websiteData.id,
					aiAgentId: input.aiAgentId ?? null,
				});

				if (currentCount >= linkLimit) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: `You have reached the limit of ${linkLimit} link sources for your plan. Please upgrade to add more.`,
					});
				}
			}

			// Create the link source with pending status
			const entry = await createLinkSource(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? null,
				url: input.url,
			});

			// Calculate crawl limit based on plan
			// For now, use a reasonable default that respects plan limits
			const crawlLimit = linkLimit === null ? 100 : Math.min(50, linkLimit * 5);

			// Enqueue the crawl job - worker will handle the actual crawling
			try {
				await triggerWebCrawl({
					linkSourceId: entry.id,
					websiteId: websiteData.id,
					organizationId: websiteData.organizationId,
					aiAgentId: input.aiAgentId ?? null,
					url: input.url,
					crawlLimit,
					createdBy: user.id,
				});
			} catch (error) {
				// If queueing fails, mark the link source as failed
				console.error(
					"[link-source:create] Failed to enqueue crawl job:",
					error
				);
				await updateLinkSource(db, {
					id: entry.id,
					websiteId: websiteData.id,
					status: "failed",
					errorMessage: "Failed to queue crawl job. Please try again.",
				});

				return toLinkSourceResponse({
					...entry,
					status: "failed",
					errorMessage: "Failed to queue crawl job. Please try again.",
				});
			}

			// Return the link source with pending status
			// Frontend will poll for status updates
			return toLinkSourceResponse(entry);
		}),

	/**
	 * Delete a link source (soft delete)
	 */
	delete: protectedProcedure
		.input(deleteLinkSourceRequestSchema)
		.output(linkSourceResponseSchema.pick({ id: true }))
		.mutation(async ({ ctx: { db, user }, input }) => {
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

			// Get the link source first
			const linkSourceEntry = await getLinkSourceById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!linkSourceEntry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Link source not found",
				});
			}

			// If there's a pending or active crawl, try to cancel both BullMQ job and Firecrawl job
			if (
				linkSourceEntry.status === "pending" ||
				linkSourceEntry.status === "crawling"
			) {
				// Cancel BullMQ queue job (for pending jobs)
				try {
					await cancelWebCrawl(input.id);
				} catch (error) {
					console.error(
						"[link-source:delete] Failed to cancel BullMQ job:",
						error
					);
					// Continue with deletion even if cancellation fails
				}

				// Cancel Firecrawl job (for active crawls)
				if (linkSourceEntry.firecrawlJobId) {
					try {
						await firecrawlService.cancelCrawl(linkSourceEntry.firecrawlJobId);
						console.log(
							`[link-source:delete] Cancelled Firecrawl job ${linkSourceEntry.firecrawlJobId}`
						);
					} catch (error) {
						console.error(
							"[link-source:delete] Failed to cancel Firecrawl job:",
							error
						);
						// Continue with deletion even if cancellation fails
					}
				}
			}

			// Soft delete associated knowledge entries
			const now = new Date().toISOString();
			await db
				.update(knowledge)
				.set({
					deletedAt: now,
					updatedAt: now,
				})
				.where(
					and(eq(knowledge.linkSourceId, input.id), isNull(knowledge.deletedAt))
				);

			// Soft delete the link source
			const deleted = await deleteLinkSource(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!deleted) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Link source not found",
				});
			}

			return { id: input.id };
		}),

	/**
	 * Cancel a crawl in progress
	 */
	cancel: protectedProcedure
		.input(cancelLinkSourceRequestSchema)
		.output(linkSourceResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
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

			const linkSourceEntry = await getLinkSourceById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!linkSourceEntry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Link source not found",
				});
			}

			// Only allow cancelling pending or crawling jobs
			if (
				linkSourceEntry.status !== "pending" &&
				linkSourceEntry.status !== "crawling"
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot cancel a crawl with status "${linkSourceEntry.status}"`,
				});
			}

			// Cancel BullMQ queue job (for pending jobs)
			try {
				await cancelWebCrawl(input.id);
			} catch (error) {
				console.error(
					"[link-source:cancel] Failed to cancel BullMQ job:",
					error
				);
				// Continue even if cancellation fails
			}

			// Cancel Firecrawl job (for active crawls)
			if (linkSourceEntry.firecrawlJobId) {
				try {
					await firecrawlService.cancelCrawl(linkSourceEntry.firecrawlJobId);
					console.log(
						`[link-source:cancel] Cancelled Firecrawl job ${linkSourceEntry.firecrawlJobId}`
					);
				} catch (error) {
					console.error(
						"[link-source:cancel] Failed to cancel Firecrawl job:",
						error
					);
					// Continue even if cancellation fails
				}
			}

			// Update status to failed with cancellation message
			const updatedEntry = await updateLinkSource(db, {
				id: input.id,
				websiteId: websiteData.id,
				status: "failed",
				errorMessage: "Cancelled by user",
			});

			return toLinkSourceResponse(updatedEntry ?? linkSourceEntry);
		}),

	/**
	 * Trigger a recrawl of an existing link source via worker
	 */
	recrawl: protectedProcedure
		.input(recrawlLinkSourceRequestSchema)
		.output(linkSourceResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
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

			const linkSourceEntry = await getLinkSourceById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!linkSourceEntry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Link source not found",
				});
			}

			// Don't allow recrawl if already crawling or pending
			if (
				linkSourceEntry.status === "crawling" ||
				linkSourceEntry.status === "pending"
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A crawl is already in progress for this source",
				});
			}

			// Calculate crawl limit based on plan
			const planInfo = await getPlanForWebsite(websiteData);
			const linkLimit = toNumericLimit(
				planInfo.features["ai-agent-training-links"]
			);
			const crawlLimit = linkLimit === null ? 100 : Math.min(50, linkLimit * 5);

			// Reset link source to pending status
			const updatedEntry = await updateLinkSource(db, {
				id: input.id,
				websiteId: websiteData.id,
				status: "pending",
				firecrawlJobId: null,
				errorMessage: null,
			});

			// Enqueue the crawl job - worker will handle the actual crawling
			try {
				await triggerWebCrawl({
					linkSourceId: input.id,
					websiteId: websiteData.id,
					organizationId: websiteData.organizationId,
					aiAgentId: linkSourceEntry.aiAgentId,
					url: linkSourceEntry.url,
					crawlLimit,
					createdBy: user.id,
				});
			} catch (error) {
				// If queueing fails, mark the link source as failed
				console.error(
					"[link-source:recrawl] Failed to enqueue crawl job:",
					error
				);
				await updateLinkSource(db, {
					id: input.id,
					websiteId: websiteData.id,
					status: "failed",
					errorMessage: "Failed to queue crawl job. Please try again.",
				});

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to queue crawl job. Please try again.",
				});
			}

			return toLinkSourceResponse(updatedEntry ?? linkSourceEntry);
		}),

	/**
	 * Get crawl status (worker updates the database)
	 */
	getCrawlStatus: protectedProcedure
		.input(getCrawlStatusRequestSchema)
		.output(linkSourceResponseSchema)
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

			const linkSourceEntry = await getLinkSourceById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!linkSourceEntry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Link source not found",
				});
			}

			// Worker handles all status updates - just return current state
			return toLinkSourceResponse(linkSourceEntry);
		}),

	/**
	 * Get training statistics
	 */
	getTrainingStats: protectedProcedure
		.input(getTrainingStatsRequestSchema)
		.output(trainingStatsResponseSchema)
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

			// Get plan limits
			const planInfo = await getPlanForWebsite(websiteData);
			const linkLimit = toNumericLimit(
				planInfo.features["ai-agent-training-links"]
			);
			const sizeLimitMb = toNumericLimit(
				planInfo.features["ai-agent-training-mb"]
			);
			const sizeLimitBytes =
				sizeLimitMb !== null ? sizeLimitMb * MB_TO_BYTES : null;

			// Get link source count
			const linkSourcesCount = await getLinkSourceCount(db, {
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? undefined,
			});

			// Get knowledge counts by type
			const knowledgeList = await listKnowledge(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? undefined,
				limit: 1000, // Get all for counting
			});

			let urlKnowledgeCount = 0;
			let faqKnowledgeCount = 0;
			let articleKnowledgeCount = 0;

			for (const item of knowledgeList.items) {
				switch (item.type) {
					case "url":
						urlKnowledgeCount++;
						break;
					case "faq":
						faqKnowledgeCount++;
						break;
					case "article":
						articleKnowledgeCount++;
						break;
					default:
						// Unknown type, ignore
						break;
				}
			}

			// Get total size
			const totalSizeBytes = await getLinkSourceTotalSize(db, {
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? undefined,
			});

			return {
				linkSourcesCount,
				urlKnowledgeCount,
				faqKnowledgeCount,
				articleKnowledgeCount,
				totalSizeBytes,
				planLimitBytes: sizeLimitBytes,
				planLimitLinks: linkLimit,
			};
		}),
});
