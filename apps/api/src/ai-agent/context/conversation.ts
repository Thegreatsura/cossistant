/**
 * Conversation Context Builder
 *
 * Builds a role-aware conversation history for the AI agent.
 * Each message is annotated with who sent it (visitor, human agent, AI).
 */

import type { Database } from "@api/db";
import { getConversationTimelineItems } from "@api/db/queries/conversation";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { getSenderType, type SenderType } from "./roles";

/**
 * Maximum number of messages to include in context
 */
const MAX_CONTEXT_MESSAGES = 30;

/**
 * A message with role attribution
 */
export type RoleAwareMessage = {
	messageId: string;
	content: string;
	senderType: SenderType;
	senderId: string | null;
	senderName: string | null;
	timestamp: string | null;
	visibility: "public" | "private";
};

type BuildHistoryParams = {
	conversationId: string;
	organizationId: string;
	websiteId: string;
};

/**
 * Build a role-aware conversation history
 *
 * This is critical for the AI to understand:
 * - Who is speaking (visitor, human agent, or AI)
 * - The flow of the conversation
 * - What the AI has already said
 */
export async function buildConversationHistory(
	db: Database,
	params: BuildHistoryParams
): Promise<RoleAwareMessage[]> {
	const { items } = await getConversationTimelineItems(db, {
		organizationId: params.organizationId,
		conversationId: params.conversationId,
		websiteId: params.websiteId,
		limit: MAX_CONTEXT_MESSAGES,
		// Include both public and private messages for full context
		visibility: [TimelineItemVisibility.PUBLIC, TimelineItemVisibility.PRIVATE],
	});

	const messages: RoleAwareMessage[] = [];

	for (const item of items) {
		// Only include message types with valid IDs
		if (item.type !== ConversationTimelineType.MESSAGE || !item.id) {
			continue;
		}

		const text = item.text ?? "";
		if (!text.trim()) {
			continue;
		}

		// Determine sender type and details
		const senderInfo = getSenderType(item);

		messages.push({
			messageId: item.id,
			content: text,
			senderType: senderInfo.type,
			senderId: senderInfo.id,
			senderName: senderInfo.name,
			timestamp: item.createdAt,
			visibility:
				item.visibility === TimelineItemVisibility.PUBLIC
					? "public"
					: "private",
		});
	}

	return messages;
}
