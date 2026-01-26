/**
 * Update Status Action
 *
 * Updates the conversation status (resolve, spam, reopen).
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

type UpdateStatusParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	websiteId: string;
	aiAgentId: string;
	newStatus: "open" | "resolved" | "spam";
};

/**
 * Update conversation status
 */
export async function updateStatus(params: UpdateStatusParams): Promise<void> {
	const {
		db,
		conversation: conv,
		organizationId,
		websiteId,
		aiAgentId,
		newStatus,
	} = params;

	// Skip if already in desired status
	if (conv.status === newStatus) {
		return;
	}

	const now = new Date().toISOString();

	// Update conversation
	const updateData: Record<string, unknown> = {
		status: newStatus,
		updatedAt: now,
	};

	if (newStatus === "resolved") {
		updateData.resolvedAt = now;
		updateData.resolvedByAiAgentId = aiAgentId;
		updateData.resolvedByUserId = null;
	}

	await db
		.update(conversation)
		.set(updateData)
		.where(eq(conversation.id, conv.id));

	// Create timeline event with proper realtime emission
	const eventText = `Status changed to ${newStatus}`;
	await createTimelineItem({
		db,
		organizationId,
		websiteId,
		conversationId: conv.id,
		conversationOwnerVisitorId: conv.visitorId,
		item: {
			type: ConversationTimelineType.EVENT,
			visibility: TimelineItemVisibility.PUBLIC,
			text: eventText,
			parts: [{ type: "text", text: eventText }],
			aiAgentId,
		},
	});
}
