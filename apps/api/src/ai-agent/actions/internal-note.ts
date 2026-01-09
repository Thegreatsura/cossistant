/**
 * Internal Note Action
 *
 * Adds a private note visible only to the support team.
 * Idempotent - uses idempotencyKey as note ID to prevent duplicates.
 */

import type { Database } from "@api/db";
import { conversationTimelineItem } from "@api/db/schema/conversation";
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

	// Check for existing note with this idempotency key (used as ID)
	const existing = await db
		.select({ id: conversationTimelineItem.id })
		.from(conversationTimelineItem)
		.where(eq(conversationTimelineItem.id, idempotencyKey))
		.limit(1);

	if (existing.length > 0) {
		return {
			noteId: existing[0].id,
			created: false,
		};
	}

	const now = new Date().toISOString();

	await db.insert(conversationTimelineItem).values({
		id: idempotencyKey, // Use idempotency key as ID for deduplication
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
		noteId: idempotencyKey,
		created: true,
	};
}
