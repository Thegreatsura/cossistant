/**
 * Assign Action
 *
 * Assigns a conversation to a team member.
 */

import type { Database } from "@api/db";
import {
	conversationAssignee,
	conversationTimelineItem,
} from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationEventType,
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { and, eq, isNull } from "drizzle-orm";

type AssignParams = {
	db: Database;
	conversationId: string;
	organizationId: string;
	userId: string;
	aiAgentId: string;
};

/**
 * Assign a conversation to a user
 */
export async function assign(params: AssignParams): Promise<void> {
	const { db, conversationId, organizationId, userId, aiAgentId } = params;

	const now = new Date().toISOString();

	// Check if already assigned
	const existing = await db
		.select({ id: conversationAssignee.id })
		.from(conversationAssignee)
		.where(
			and(
				eq(conversationAssignee.conversationId, conversationId),
				eq(conversationAssignee.userId, userId),
				isNull(conversationAssignee.unassignedAt)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		// Already assigned
		return;
	}

	// Create assignee record
	await db.insert(conversationAssignee).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		userId,
		assignedByAiAgentId: aiAgentId,
		assignedByUserId: null,
		assignedAt: now,
		createdAt: now,
	});

	// Create timeline event
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PUBLIC,
		text: "AI assigned conversation",
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
