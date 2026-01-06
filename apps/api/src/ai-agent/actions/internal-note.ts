/**
 * Internal Note Action
 *
 * Adds a private note visible only to the support team.
 */

import type { Database } from "@api/db";
import { conversationTimelineItem } from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";

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
	const { db, conversationId, organizationId, aiAgentId, text } = params;

	const noteId = generateShortPrimaryId();
	const now = new Date().toISOString();

	await db.insert(conversationTimelineItem).values({
		id: noteId,
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
