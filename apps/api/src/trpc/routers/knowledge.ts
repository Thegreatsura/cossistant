import {
	createKnowledge,
	deleteKnowledge,
	getKnowledgeById,
	listKnowledge,
	updateKnowledge,
} from "@api/db/queries/knowledge";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import {
	createKnowledgeRequestSchema,
	deleteKnowledgeRequestSchema,
	getKnowledgeRequestSchema,
	type KnowledgeResponse,
	knowledgeResponseSchema,
	listKnowledgeRequestSchema,
	listKnowledgeResponseSchema,
	updateKnowledgeRequestSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

function toKnowledgeResponse(entry: {
	id: string;
	organizationId: string;
	websiteId: string;
	aiAgentId: string | null;
	type: "url" | "faq" | "article";
	sourceUrl: string | null;
	sourceTitle: string | null;
	origin: string;
	createdBy: string;
	contentHash: string;
	payload: unknown;
	metadata: unknown;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}): KnowledgeResponse {
	return {
		id: entry.id,
		organizationId: entry.organizationId,
		websiteId: entry.websiteId,
		aiAgentId: entry.aiAgentId,
		type: entry.type,
		sourceUrl: entry.sourceUrl,
		sourceTitle: entry.sourceTitle,
		origin: entry.origin,
		createdBy: entry.createdBy,
		contentHash: entry.contentHash,
		payload: entry.payload as KnowledgeResponse["payload"],
		metadata: entry.metadata as KnowledgeResponse["metadata"],
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		deletedAt: entry.deletedAt,
	};
}

export const knowledgeRouter = createTRPCRouter({
	/**
	 * List knowledge entries with filters and pagination
	 */
	list: protectedProcedure
		.input(listKnowledgeRequestSchema)
		.output(listKnowledgeResponseSchema)
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

			const result = await listKnowledge(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				type: input.type,
				aiAgentId: input.aiAgentId,
				page: input.page,
				limit: input.limit,
			});

			return {
				items: result.items.map(toKnowledgeResponse),
				pagination: result.pagination,
			};
		}),

	/**
	 * Get a single knowledge entry by ID
	 */
	get: protectedProcedure
		.input(getKnowledgeRequestSchema)
		.output(knowledgeResponseSchema.nullable())
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

			const entry = await getKnowledgeById(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!entry) {
				return null;
			}

			return toKnowledgeResponse(entry);
		}),

	/**
	 * Create a new knowledge entry
	 */
	create: protectedProcedure
		.input(createKnowledgeRequestSchema)
		.output(knowledgeResponseSchema)
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

			const entry = await createKnowledge(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId ?? null,
				type: input.type,
				sourceUrl: input.sourceUrl ?? null,
				sourceTitle: input.sourceTitle ?? null,
				origin: input.origin,
				createdBy: user.id,
				payload: input.payload,
				metadata: input.metadata ?? null,
			});

			return toKnowledgeResponse(entry);
		}),

	/**
	 * Update an existing knowledge entry
	 */
	update: protectedProcedure
		.input(updateKnowledgeRequestSchema)
		.output(knowledgeResponseSchema)
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

			const entry = await updateKnowledge(db, {
				id: input.id,
				websiteId: websiteData.id,
				aiAgentId: input.aiAgentId,
				sourceUrl: input.sourceUrl,
				sourceTitle: input.sourceTitle,
				payload: input.payload,
				metadata: input.metadata ?? undefined,
			});

			if (!entry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Knowledge entry not found",
				});
			}

			return toKnowledgeResponse(entry);
		}),

	/**
	 * Delete a knowledge entry (soft delete)
	 */
	delete: protectedProcedure
		.input(deleteKnowledgeRequestSchema)
		.output(knowledgeResponseSchema.pick({ id: true }))
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

			const deleted = await deleteKnowledge(db, {
				id: input.id,
				websiteId: websiteData.id,
			});

			if (!deleted) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Knowledge entry not found",
				});
			}

			return { id: input.id };
		}),
});
