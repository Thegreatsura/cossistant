import { z } from "@hono/zod-openapi";

export const linkSourceStatusSchema = z
	.enum(["pending", "crawling", "completed", "failed"])
	.openapi({
		description: "Link source crawl status",
		example: "completed",
	});

/**
 * Link source response schema - used for single item responses
 */
export const linkSourceResponseSchema = z
	.object({
		id: z.ulid().openapi({
			description: "Link source identifier",
			example: "01JG00000000000000000000A",
		}),
		organizationId: z.ulid().openapi({
			description: "Owning organization identifier",
			example: "01JG000000000000000000000",
		}),
		websiteId: z.ulid().openapi({
			description: "Website identifier",
			example: "01JG000000000000000000001",
		}),
		aiAgentId: z.ulid().nullable().openapi({
			description:
				"Optional AI agent identifier; null means shared at website scope",
			example: "01JG000000000000000000002",
		}),
		url: z.url().openapi({
			description: "Root URL to crawl",
			example: "https://docs.example.com",
		}),
		status: linkSourceStatusSchema,
		firecrawlJobId: z.string().nullable().openapi({
			description: "Firecrawl job ID for tracking async crawl",
			example: "fc_job_123456",
		}),
		crawledPagesCount: z.number().int().nonnegative().openapi({
			description: "Number of pages successfully crawled",
			example: 15,
		}),
		totalSizeBytes: z.number().int().nonnegative().openapi({
			description: "Total size of crawled content in bytes",
			example: 102_400,
		}),
		lastCrawledAt: z.string().nullable().openapi({
			description: "Timestamp of last successful crawl",
			example: "2024-06-10T12:00:00.000Z",
		}),
		errorMessage: z.string().nullable().openapi({
			description: "Error message if crawl failed",
			example: null,
		}),
		createdAt: z.string().openapi({
			description: "Creation timestamp",
			example: "2024-06-10T12:00:00.000Z",
		}),
		updatedAt: z.string().openapi({
			description: "Last update timestamp",
			example: "2024-06-11T08:00:00.000Z",
		}),
		deletedAt: z.string().nullable().openapi({
			description: "Soft delete timestamp",
			example: null,
		}),
	})
	.openapi({
		description: "Link source response",
	});

export type LinkSourceResponse = z.infer<typeof linkSourceResponseSchema>;
export type LinkSourceStatus = z.infer<typeof linkSourceStatusSchema>;

// ============================================================================
// API Request/Response Schemas
// ============================================================================

/**
 * List link sources request schema (TRPC) - with websiteSlug
 */
export const listLinkSourcesRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug to list link sources for",
			example: "my-website",
		}),
		aiAgentId: z.ulid().nullable().optional().openapi({
			description:
				"Filter by AI agent ID; null for shared entries; omit for all",
			example: "01JG000000000000000000002",
		}),
		status: linkSourceStatusSchema.optional().openapi({
			description: "Filter by crawl status",
			example: "completed",
		}),
		page: z.coerce.number().int().positive().default(1).openapi({
			description: "Page number (1-indexed)",
			example: 1,
		}),
		limit: z.coerce.number().int().positive().max(100).default(20).openapi({
			description: "Items per page (max 100)",
			example: 20,
		}),
	})
	.openapi({
		description: "Request to list link sources with filters and pagination",
	});

export type ListLinkSourcesRequest = z.infer<
	typeof listLinkSourcesRequestSchema
>;

/**
 * List link sources response schema
 */
export const listLinkSourcesResponseSchema = z
	.object({
		items: z.array(linkSourceResponseSchema).openapi({
			description: "Array of link sources",
		}),
		pagination: z
			.object({
				page: z.number().int().positive().openapi({
					description: "Current page number",
					example: 1,
				}),
				limit: z.number().int().positive().openapi({
					description: "Items per page",
					example: 20,
				}),
				total: z.number().int().nonnegative().openapi({
					description: "Total number of items",
					example: 100,
				}),
				hasMore: z.boolean().openapi({
					description: "Whether there are more items available",
					example: true,
				}),
			})
			.openapi({
				description: "Pagination metadata",
			}),
	})
	.openapi({
		description: "Paginated list of link sources",
	});

export type ListLinkSourcesResponse = z.infer<
	typeof listLinkSourcesResponseSchema
>;

/**
 * Get link source request schema (TRPC)
 */
export const getLinkSourceRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		id: z.ulid().openapi({
			description: "Link source ID",
			example: "01JG00000000000000000000A",
		}),
	})
	.openapi({
		description: "Request to get a single link source",
	});

export type GetLinkSourceRequest = z.infer<typeof getLinkSourceRequestSchema>;

/**
 * Create link source request schema (TRPC)
 */
export const createLinkSourceRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug to create link source for",
			example: "my-website",
		}),
		aiAgentId: z.ulid().nullable().optional().openapi({
			description:
				"Optional AI agent ID; null/omit for shared at website scope",
			example: "01JG000000000000000000002",
		}),
		url: z.url().openapi({
			description: "Root URL to crawl",
			example: "https://docs.example.com",
		}),
	})
	.openapi({
		description: "Request to create a new link source and trigger crawl",
	});

export type CreateLinkSourceRequest = z.infer<
	typeof createLinkSourceRequestSchema
>;

/**
 * Delete link source request schema (TRPC)
 */
export const deleteLinkSourceRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		id: z.ulid().openapi({
			description: "Link source ID to delete",
			example: "01JG00000000000000000000A",
		}),
	})
	.openapi({
		description: "Request to delete a link source",
	});

export type DeleteLinkSourceRequest = z.infer<
	typeof deleteLinkSourceRequestSchema
>;

/**
 * Recrawl link source request schema (TRPC)
 */
export const recrawlLinkSourceRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		id: z.ulid().openapi({
			description: "Link source ID to recrawl",
			example: "01JG00000000000000000000A",
		}),
	})
	.openapi({
		description: "Request to trigger a recrawl of an existing link source",
	});

export type RecrawlLinkSourceRequest = z.infer<
	typeof recrawlLinkSourceRequestSchema
>;

/**
 * Cancel link source request schema (TRPC)
 */
export const cancelLinkSourceRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		id: z.ulid().openapi({
			description: "Link source ID to cancel",
			example: "01JG00000000000000000000A",
		}),
	})
	.openapi({
		description: "Request to cancel a crawl in progress",
	});

export type CancelLinkSourceRequest = z.infer<
	typeof cancelLinkSourceRequestSchema
>;

/**
 * Get crawl status request schema (TRPC)
 */
export const getCrawlStatusRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		id: z.ulid().openapi({
			description: "Link source ID to check status",
			example: "01JG00000000000000000000A",
		}),
	})
	.openapi({
		description: "Request to get crawl status of a link source",
	});

export type GetCrawlStatusRequest = z.infer<typeof getCrawlStatusRequestSchema>;

/**
 * Training stats response schema
 */
export const trainingStatsResponseSchema = z
	.object({
		linkSourcesCount: z.number().int().nonnegative().openapi({
			description: "Total number of link sources",
			example: 5,
		}),
		urlKnowledgeCount: z.number().int().nonnegative().openapi({
			description: "Total number of URL knowledge entries",
			example: 50,
		}),
		faqKnowledgeCount: z.number().int().nonnegative().openapi({
			description: "Total number of FAQ knowledge entries",
			example: 20,
		}),
		articleKnowledgeCount: z.number().int().nonnegative().openapi({
			description: "Total number of article knowledge entries",
			example: 10,
		}),
		totalSizeBytes: z.number().int().nonnegative().openapi({
			description: "Total size of all knowledge in bytes",
			example: 512_000,
		}),
		planLimitBytes: z.number().int().nonnegative().nullable().openapi({
			description: "Plan limit for knowledge size in bytes (null = unlimited)",
			example: 10_485_760,
		}),
		planLimitLinks: z.number().int().nonnegative().nullable().openapi({
			description: "Plan limit for number of link sources (null = unlimited)",
			example: 100,
		}),
	})
	.openapi({
		description: "Training statistics for the AI agent",
	});

export type TrainingStatsResponse = z.infer<typeof trainingStatsResponseSchema>;

/**
 * Get training stats request schema (TRPC)
 */
export const getTrainingStatsRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug",
			example: "my-website",
		}),
		aiAgentId: z.ulid().nullable().optional().openapi({
			description:
				"Filter by AI agent ID; null for shared entries; omit for all",
			example: "01JG000000000000000000002",
		}),
	})
	.openapi({
		description: "Request to get training statistics",
	});

export type GetTrainingStatsRequest = z.infer<
	typeof getTrainingStatsRequestSchema
>;
