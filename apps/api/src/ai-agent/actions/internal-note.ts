/**
 * Internal Note Action
 *
 * Adds a private note visible only to the support team.
 * Idempotent - uses idempotencyKey as note ID to prevent duplicates.
 */

import type { Database } from "@api/db";
import { conversationTimelineItem } from "@api/db/schema/conversation";
import { generateIdempotentULID } from "@api/utils/db/ids";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";

type AddInternalNoteParams = {
	db: Database;
	conversationId: string;
	organizationId: string;
	aiAgentId: string;
	text: string;
	idempotencyKey: string;
};

type AddInternalNoteResult = {
	noteId: string;
	created: boolean;
};

/**
 * Add a private internal note
 */
export async function addInternalNote(
	params: AddInternalNoteParams
): Promise<AddInternalNoteResult> {
	const {
		db,
		conversationId,
		organizationId,
		aiAgentId,
		text,
		idempotencyKey,
	} = params;

	// Generate a valid 26-char ULID from the idempotency key
	const noteId = generateIdempotentULID(idempotencyKey);

	// Check for existing note with this ID
	const existing = await db
		.select({ id: conversationTimelineItem.id })
		.from(conversationTimelineItem)
		.where(eq(conversationTimelineItem.id, noteId))
		.limit(1);

	if (existing.length > 0) {
		return {
			noteId: existing[0].id,
			created: false,
		};
	}

	const now = new Date().toISOString();

	await db.insert(conversationTimelineItem).values({
		id: noteId, // Use deterministic ULID for deduplication
		conversationId,
		organizationId,
		type: ConversationTimelineType.MESSAGE,
		visibility: TimelineItemVisibility.PRIVATE,
		text,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});

	return {
		noteId,
		created: true,
	};
}
