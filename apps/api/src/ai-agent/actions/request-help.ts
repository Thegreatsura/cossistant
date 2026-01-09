/**
 * Request Help Action
 *
 * Requests a team member to join as a participant.
 */

import type { Database } from "@api/db";
import {
	conversationParticipant,
	conversationTimelineItem,
} from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationEventType,
	ConversationParticipationStatus,
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { and, eq } from "drizzle-orm";

type RequestHelpParams = {
	db: Database;
	conversationId: string;
	organizationId: string;
	userId: string;
	aiAgentId: string;
	reason: string;
};

/**
 * Request a user to participate in the conversation
 */
export async function requestHelp(params: RequestHelpParams): Promise<void> {
	const { db, conversationId, organizationId, userId, aiAgentId, reason } =
		params;

	const now = new Date().toISOString();

	// Check if already a participant
	const existing = await db
		.select({ id: conversationParticipant.id })
		.from(conversationParticipant)
		.where(
			and(
				eq(conversationParticipant.conversationId, conversationId),
				eq(conversationParticipant.userId, userId)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		// Already a participant
		return;
	}

	// Create participant request
	await db.insert(conversationParticipant).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		userId,
		status: ConversationParticipationStatus.REQUESTED,
		reason,
		requestedByAiAgentId: aiAgentId,
		requestedByUserId: null,
		joinedAt: now,
		createdAt: now,
	});

	// Create timeline event
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PRIVATE, // Private - team only
		text: `AI requested assistance: ${reason}`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
