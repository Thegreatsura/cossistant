import { z } from "@hono/zod-openapi";

export const knowledgeTypeSchema = z.enum(["url", "faq", "article"]).openapi({
	description: "Knowledge entry type",
	example: "url",
});

const headingSchema = z.object({
	level: z.number().int().min(1).max(6).openapi({
		description: "Heading level (1-6)",
		example: 2,
	}),
	text: z.string().min(1).openapi({
		description: "Heading text content",
		example: "Getting started",
	}),
});

const linkSchema = z.string().url().openapi({
	description: "Absolute URL discovered in the document",
	example: "https://docs.cossistant.com/guide",
});

const imageSchema = z.object({
	src: z.string().url().openapi({
		description: "Image URL captured during scraping",
		example: "https://cdn.cossistant.com/assets/hero.png",
	}),
	alt: z.string().nullable().openapi({
		description: "Optional alt text attached to the image",
		example: "Agent dashboard hero illustration",
	}),
});

export const urlKnowledgePayloadSchema = z
	.object({
		markdown: z.string().min(1).openapi({
			description: "Scraped markdown body",
			example: "# Welcome to the Help Center",
		}),
		headings: z.array(headingSchema).default([]),
		links: z.array(linkSchema).default([]),
		images: z.array(imageSchema).default([]),
		estimatedTokens: z.number().int().nonnegative().optional().openapi({
			description: "Heuristic token count to assist chunking",
			example: 2048,
		}),
	})
	.openapi({
		description: "Structured payload for raw page content",
	});

export const faqKnowledgePayloadSchema = z
	.object({
		question: z.string().min(1).openapi({
			description: "FAQ question",
			example: "How do I reset my password?",
		}),
		answer: z.string().min(1).openapi({
			description: "Answer shown to customers",
			example: "Go to Settings → Security and click Reset password.",
		}),
		categories: z.array(z.string()).default([]),
		relatedQuestions: z.array(z.string()).default([]),
	})
	.openapi({
		description: "Payload describing a single FAQ entry",
	});

export const articleKnowledgePayloadSchema = z
	.object({
		title: z.string().min(1).openapi({
			description: "Article title",
			example: "Billing and invoicing overview",
		}),
		summary: z.string().nullable().optional().openapi({
			description: "Short synopsis or excerpt",
			example: "Understand how billing cycles and invoices are generated.",
		}),
		markdown: z.string().min(1).openapi({
			description: "Article body in markdown format",
			example: "## Billing cycles\n\nCossistant bills you monthly...",
		}),
		keywords: z.array(z.string()).default([]),
		heroImage: imageSchema.optional(),
	})
	.openapi({
		description: "Payload describing a full article or help doc",
	});

const metadataSchema = z
	.record(z.string(), z.unknown())
	.optional()
	.openapi({
		description: "Arbitrary metadata such as locale or crawl depth",
		example: {
			locale: "en-US",
			source: "firecrawl",
		},
	});

const baseKnowledgeFields = {
	organizationId: z.string().ulid().openapi({
		description: "Owning organization identifier",
		example: "01JG000000000000000000000",
	}),
	websiteId: z.string().ulid().openapi({
		description: "Website identifier",
		example: "01JG000000000000000000001",
	}),
	aiAgentId: z.string().ulid().nullable().optional().openapi({
		description:
			"Optional AI agent identifier; null/omitted means the entry is shared at the website scope.",
		example: "01JG000000000000000000002",
	}),
	sourceUrl: z.string().url().nullable().openapi({
		description:
			"Origin URL for this entry (required for url knowledge; optional for others)",
		example: "https://docs.cossistant.com/getting-started",
	}),
	sourceTitle: z.string().nullable().openapi({
		description: "Readable title captured during scraping",
		example: "Getting started with the Cossistant dashboard",
	}),
	origin: z.string().min(1).openapi({
		description:
			"Describes how this entry was created (crawl, manual, agent, etc.)",
		example: "crawl",
	}),
	createdBy: z.string().min(1).openapi({
		description:
			"Identifier of the actor (user, agent, system) that created this entry",
		example: "user_01JG00000000000000000000",
	}),
	contentHash: z.string().min(1).openapi({
		description: "Deterministic hash of the payload for deduping",
		example: "5d41402abc4b2a76b9719d911017c592",
	}),
	metadata: metadataSchema,
};

const urlKnowledgeSchema = z
	.object(baseKnowledgeFields)
	.extend({
		type: z.literal("url"),
		sourceUrl: z.string().url(),
		payload: urlKnowledgePayloadSchema,
	})
	.openapi({ description: "URL knowledge entry" });

const faqKnowledgeSchema = z
	.object(baseKnowledgeFields)
	.extend({
		type: z.literal("faq"),
		payload: faqKnowledgePayloadSchema,
	})
	.openapi({ description: "FAQ knowledge entry" });

const articleKnowledgeSchema = z
	.object(baseKnowledgeFields)
	.extend({
		type: z.literal("article"),
		sourceUrl: z.string().url().nullable(),
		payload: articleKnowledgePayloadSchema,
	})
	.openapi({ description: "Article knowledge entry" });

export const knowledgeCreateSchema = z.discriminatedUnion("type", [
	urlKnowledgeSchema,
	faqKnowledgeSchema,
	articleKnowledgeSchema,
]);

const knowledgeAuditFieldsSchema = z.object({
	id: z.ulid().openapi({
		description: "Knowledge entry identifier",
		example: "01JG00000000000000000000A",
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
});

export const knowledgeSchema = knowledgeCreateSchema
	// Intersection preserves the discriminated union while adding persisted fields.
	.and(knowledgeAuditFieldsSchema)
	.openapi({
		description: "Persisted knowledge entry",
	});

export type KnowledgeType = z.infer<typeof knowledgeTypeSchema>;
export type UrlKnowledgePayload = z.infer<typeof urlKnowledgePayloadSchema>;
export type FaqKnowledgePayload = z.infer<typeof faqKnowledgePayloadSchema>;
export type ArticleKnowledgePayload = z.infer<
	typeof articleKnowledgePayloadSchema
>;
export type KnowledgeCreateInput = z.infer<typeof knowledgeCreateSchema>;
export type Knowledge = z.infer<typeof knowledgeSchema>;
