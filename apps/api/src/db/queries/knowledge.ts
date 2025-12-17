import { createHash } from "node:crypto";
import type { Database } from "@api/db";
import {
	type KnowledgeInsert,
	type KnowledgeSelect,
	knowledge,
} from "@api/db/schema/knowledge";
import { generateULID } from "@api/utils/db/ids";
import type { KnowledgeType } from "@cossistant/types";
import { and, count, eq, isNull } from "drizzle-orm";

/**
 * Generate a content hash for deduplication
 */
export function generateContentHash(payload: unknown): string {
	const content = JSON.stringify(payload);
	return createHash("md5").update(content).digest("hex");
}

/**
 * Get a knowledge entry by ID
 */
export async function getKnowledgeById(
	db: Database,
	params: {
		id: string;
		websiteId: string;
	}
): Promise<KnowledgeSelect | null> {
	const [entry] = await db
		.select()
		.from(knowledge)
		.where(
			and(
				eq(knowledge.id, params.id),
				eq(knowledge.websiteId, params.websiteId),
				isNull(knowledge.deletedAt)
			)
		)
		.limit(1);

	return entry ?? null;
}

/**
 * Get knowledge entry by content hash (for deduplication)
 */
export async function getKnowledgeByContentHash(
	db: Database,
	params: {
		websiteId: string;
		aiAgentId: string | null;
		contentHash: string;
	}
): Promise<KnowledgeSelect | null> {
	const conditions = [
		eq(knowledge.websiteId, params.websiteId),
		eq(knowledge.contentHash, params.contentHash),
		isNull(knowledge.deletedAt),
	];

	// Handle null aiAgentId - shared knowledge
	if (params.aiAgentId === null) {
		conditions.push(isNull(knowledge.aiAgentId));
	} else {
		conditions.push(eq(knowledge.aiAgentId, params.aiAgentId));
	}

	const [entry] = await db
		.select()
		.from(knowledge)
		.where(and(...conditions))
		.limit(1);

	return entry ?? null;
}

/**
 * List knowledge entries with filters and pagination
 */
export async function listKnowledge(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		type?: KnowledgeType;
		aiAgentId?: string | null;
		page?: number;
		limit?: number;
	}
): Promise<{
	items: KnowledgeSelect[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		hasMore: boolean;
	};
}> {
	const page = params.page ?? 1;
	const limit = params.limit ?? 20;
	const offset = (page - 1) * limit;

	// Build where conditions
	const whereConditions = [
		eq(knowledge.organizationId, params.organizationId),
		eq(knowledge.websiteId, params.websiteId),
		isNull(knowledge.deletedAt),
	];

	// Filter by type if provided
	if (params.type) {
		whereConditions.push(eq(knowledge.type, params.type));
	}

	// Filter by aiAgentId if explicitly provided (including null for shared)
	if (params.aiAgentId !== undefined) {
		if (params.aiAgentId === null) {
			whereConditions.push(isNull(knowledge.aiAgentId));
		} else {
			whereConditions.push(eq(knowledge.aiAgentId, params.aiAgentId));
		}
	}

	// Get total count
	const [countResult] = await db
		.select({ total: count() })
		.from(knowledge)
		.where(and(...whereConditions));

	const total = Number(countResult?.total ?? 0);

	// Get paginated items
	const items = await db
		.select()
		.from(knowledge)
		.where(and(...whereConditions))
		.orderBy(knowledge.createdAt)
		.limit(limit)
		.offset(offset);

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			hasMore: page * limit < total,
		},
	};
}

/**
 * Create a new knowledge entry
 */
export async function createKnowledge(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		aiAgentId?: string | null;
		type: KnowledgeType;
		sourceUrl?: string | null;
		sourceTitle?: string | null;
		origin: string;
		createdBy: string;
		payload: unknown;
		metadata?: Record<string, unknown> | null;
	}
): Promise<KnowledgeSelect> {
	const now = new Date().toISOString();
	const contentHash = generateContentHash(params.payload);

	const newEntry: KnowledgeInsert = {
		id: generateULID(),
		organizationId: params.organizationId,
		websiteId: params.websiteId,
		aiAgentId: params.aiAgentId ?? null,
		type: params.type,
		sourceUrl: params.sourceUrl ?? null,
		sourceTitle: params.sourceTitle ?? null,
		origin: params.origin,
		createdBy: params.createdBy,
		contentHash,
		payload: params.payload,
		metadata: params.metadata ?? null,
		createdAt: now,
		updatedAt: now,
	};

	const [entry] = await db.insert(knowledge).values(newEntry).returning();

	if (!entry) {
		throw new Error("Failed to create knowledge entry");
	}

	return entry;
}

/**
 * Update an existing knowledge entry
 */
export async function updateKnowledge(
	db: Database,
	params: {
		id: string;
		websiteId: string;
		aiAgentId?: string | null;
		sourceUrl?: string | null;
		sourceTitle?: string | null;
		payload?: unknown;
		metadata?: Record<string, unknown> | null;
	}
): Promise<KnowledgeSelect | null> {
	const now = new Date().toISOString();

	// Build update object - only include fields that are explicitly provided
	const updateData: Partial<KnowledgeInsert> = {
		updatedAt: now,
	};

	if (params.aiAgentId !== undefined) {
		updateData.aiAgentId = params.aiAgentId;
	}

	if (params.sourceUrl !== undefined) {
		updateData.sourceUrl = params.sourceUrl;
	}

	if (params.sourceTitle !== undefined) {
		updateData.sourceTitle = params.sourceTitle;
	}

	if (params.payload !== undefined) {
		updateData.payload = params.payload;
		updateData.contentHash = generateContentHash(params.payload);
	}

	if (params.metadata !== undefined) {
		updateData.metadata = params.metadata;
	}

	const [entry] = await db
		.update(knowledge)
		.set(updateData)
		.where(
			and(
				eq(knowledge.id, params.id),
				eq(knowledge.websiteId, params.websiteId),
				isNull(knowledge.deletedAt)
			)
		)
		.returning();

	return entry ?? null;
}

/**
 * Soft delete a knowledge entry
 */
export async function deleteKnowledge(
	db: Database,
	params: {
		id: string;
		websiteId: string;
	}
): Promise<boolean> {
	const now = new Date().toISOString();

	const [entry] = await db
		.update(knowledge)
		.set({
			deletedAt: now,
			updatedAt: now,
		})
		.where(
			and(
				eq(knowledge.id, params.id),
				eq(knowledge.websiteId, params.websiteId),
				isNull(knowledge.deletedAt)
			)
		)
		.returning({ id: knowledge.id });

	return Boolean(entry);
}
