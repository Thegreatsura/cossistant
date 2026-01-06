/**
 * Update Status Action
 *
 * Updates the conversation status (resolve, spam, reopen).
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
	ConversationStatus,
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";

type UpdateStatusParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
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

	// Create timeline event
	const eventType =
		newStatus === "resolved"
			? ConversationEventType.RESOLVED
			: ConversationEventType.STATUS_CHANGED;

	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId: conv.id,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PUBLIC,
		text: `Status changed to ${newStatus}`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
