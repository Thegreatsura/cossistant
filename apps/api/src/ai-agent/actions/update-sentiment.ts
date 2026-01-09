/**
 * Update Sentiment Action
 *
 * Updates the conversation sentiment (background analysis).
 * Creates a private event - not visible to visitors.
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

type UpdateSentimentParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	aiAgentId: string;
	sentiment: "positive" | "negative" | "neutral";
	confidence: number;
};

/**
 * Update conversation sentiment
 */
export async function updateSentiment(
	params: UpdateSentimentParams
): Promise<void> {
	const {
		db,
		conversation: conv,
		organizationId,
		aiAgentId,
		sentiment,
		confidence,
	} = params;

	const now = new Date().toISOString();

	// Update conversation
	await db
		.update(conversation)
		.set({
			sentiment,
			sentimentConfidence: confidence,
			updatedAt: now,
		})
		.where(eq(conversation.id, conv.id));

	// Create private timeline event (AI_ANALYZED)
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId: conv.id,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PRIVATE, // Private - team only
		text: `AI analyzed sentiment: ${sentiment} (${Math.round(confidence * 100)}% confidence)`,
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
