/**
 * Update Title Action
 *
 * Updates the conversation title (background analysis).
 * Creates a private event - not visible to visitors.
 * Emits real-time event for dashboard and widget updates.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import {
	conversation,
	conversationTimelineItem,
} from "@api/db/schema/conversation";
import { realtime } from "@api/realtime/emitter";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";

type UpdateTitleParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	websiteId: string;
	aiAgentId: string;
	title: string;
};

/**
 * Update conversation title
 */
export async function updateTitle(params: UpdateTitleParams): Promise<void> {
	const {
		db,
		conversation: conv,
		organizationId,
		websiteId,
		aiAgentId,
		title,
	} = params;

	// Skip if title already exists
	if (conv.title) {
		return;
	}

	const now = new Date().toISOString();

	// Update conversation
	await db
		.update(conversation)
		.set({
			title,
			updatedAt: now,
		})
		.where(eq(conversation.id, conv.id));

	// Create private timeline event (TITLE_GENERATED)
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId: conv.id,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PRIVATE, // Private - team only
		text: `AI generated title: "${title}"`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});

	// Emit conversationUpdated event for real-time dashboard and widget updates
	await realtime.emit("conversationUpdated", {
		websiteId,
		organizationId,
		visitorId: conv.visitorId,
		userId: null,
		conversationId: conv.id,
		updates: {
			title,
		},
		aiAgentId,
	});
}
