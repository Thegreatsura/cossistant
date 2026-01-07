/**
 * Escalate Action
 *
 * Escalates a conversation to human support.
 * This is a compound action that may assign and update priority.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import {
	conversation,
	conversationTimelineItem,
} from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { eq } from "drizzle-orm";
import { assign } from "./assign";
import { updatePriority } from "./update-priority";

type EscalateParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	aiAgentId: string;
	reason: string;
	assignToUserId?: string;
	urgency?: "normal" | "high" | "urgent";
};

/**
 * Escalate a conversation to human support
 */
export async function escalate(params: EscalateParams): Promise<void> {
	const {
		db,
		conversation: conv,
		organizationId,
		aiAgentId,
		reason,
		assignToUserId,
		urgency = "normal",
	} = params;

	const now = new Date().toISOString();

	// Update conversation with escalation info
	await db
		.update(conversation)
		.set({
			updatedAt: now,
			escalatedAt: now,
			escalatedByAiAgentId: aiAgentId,
			escalationReason: reason,
		})
		.where(eq(conversation.id, conv.id));

	// Create escalation event (private - AI_ESCALATED)
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId: conv.id,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PRIVATE, // Private - team only
		text: `AI escalated: ${reason}`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});

	// Assign to specific user if provided
	if (assignToUserId) {
		await assign({
			db,
			conversationId: conv.id,
			organizationId,
			userId: assignToUserId,
			aiAgentId,
		});
	}

	// Update priority based on urgency
	if (urgency !== "normal") {
		await updatePriority({
			db,
			conversation: conv,
			organizationId,
			aiAgentId,
			newPriority: urgency,
		});
	}
}
