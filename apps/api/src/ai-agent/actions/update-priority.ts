/**
 * Update Priority Action
 *
 * Updates the conversation priority.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import {
	conversation,
	conversationTimelineItem,
} from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationEventType,
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";

type UpdatePriorityParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	aiAgentId: string;
	newPriority: "low" | "normal" | "high" | "urgent";
};

/**
 * Update conversation priority
 */
export async function updatePriority(
	params: UpdatePriorityParams
): Promise<void> {
	const {
		db,
		conversation: conv,
		organizationId,
		aiAgentId,
		newPriority,
	} = params;

	// Skip if already at desired priority
	if (conv.priority === newPriority) {
		return;
	}

	const now = new Date().toISOString();

	// Update conversation
	await db
		.update(conversation)
		.set({
			priority: newPriority,
			updatedAt: now,
		})
		.where(eq(conversation.id, conv.id));

	// Create timeline event
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId: conv.id,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PUBLIC,
		text: `Priority changed to ${newPriority}`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
