/**
 * Update Priority Action
 *
 * Updates the conversation priority.
 * Creates a private event - not visible to visitors.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { conversation } from "@api/db/schema/conversation";
import { createTimelineItem } from "@api/utils/timeline-item";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";

type UpdatePriorityParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	websiteId: string;
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
		websiteId,
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

	// Create private timeline event (not visible to visitors)
	const eventText = `Priority changed to ${newPriority}`;
	await createTimelineItem({
		db,
		organizationId,
		websiteId,
		conversationId: conv.id,
		conversationOwnerVisitorId: conv.visitorId,
		item: {
			type: ConversationTimelineType.EVENT,
			visibility: TimelineItemVisibility.PRIVATE,
			text: eventText,
			parts: [{ type: "text", text: eventText }],
			aiAgentId,
		},
	});
}
