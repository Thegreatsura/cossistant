/**
 * Conversation State
 *
 * Provides information about the current state of the conversation
 * including assignees, participants, and escalation status.
 */

import type { Database } from "@api/db";
import {
	conversationAssignee,
	conversationParticipant,
} from "@api/db/schema/conversation";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Current state of the conversation
 */
export type ConversationState = {
	hasHumanAssignee: boolean;
	assigneeIds: string[];
	participantIds: string[];
	isEscalated: boolean;
	escalationReason: string | null;
};

type GetStateParams = {
	conversationId: string;
	organizationId: string;
};

/**
 * Get the current state of a conversation
 */
export async function getConversationState(
	db: Database,
	params: GetStateParams
): Promise<ConversationState> {
	// Get active assignees
	const assignees = await db
		.select({ userId: conversationAssignee.userId })
		.from(conversationAssignee)
		.where(
			and(
				eq(conversationAssignee.conversationId, params.conversationId),
				eq(conversationAssignee.organizationId, params.organizationId),
				isNull(conversationAssignee.unassignedAt)
			)
		);

	// Get active participants
	const participants = await db
		.select({ userId: conversationParticipant.userId })
		.from(conversationParticipant)
		.where(
			and(
				eq(conversationParticipant.conversationId, params.conversationId),
				eq(conversationParticipant.organizationId, params.organizationId),
				isNull(conversationParticipant.leftAt)
			)
		);

	const assigneeIds = assignees.map((a) => a.userId);
	const participantIds = participants.map((p) => p.userId);

	// TODO: Check escalation status from conversation table once column is added
	const isEscalated: boolean = false;
	const escalationReason: string | null = null;

	return {
		hasHumanAssignee: assigneeIds.length > 0,
		assigneeIds,
		participantIds,
		isEscalated,
		escalationReason,
	};
}
