/**
 * Categorize Action
 *
 * Adds a conversation to a view/category.
 */

import type { Database } from "@api/db";
import {
	conversationTimelineItem,
	conversationView,
} from "@api/db/schema/conversation";
import { generateShortPrimaryId } from "@api/utils/db/ids";
import {
	ConversationEventType,
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { and, eq, isNull } from "drizzle-orm";

type CategorizeParams = {
	db: Database;
	conversationId: string;
	organizationId: string;
	viewId: string;
	aiAgentId: string;
};

/**
 * Add a conversation to a view
 */
export async function categorize(params: CategorizeParams): Promise<void> {
	const { db, conversationId, organizationId, viewId, aiAgentId } = params;

	const now = new Date().toISOString();

	// Check if already in view
	const existing = await db
		.select({ id: conversationView.id })
		.from(conversationView)
		.where(
			and(
				eq(conversationView.conversationId, conversationId),
				eq(conversationView.viewId, viewId),
				isNull(conversationView.deletedAt)
			)
		)
		.limit(1);

	if (existing.length > 0) {
		// Already categorized
		return;
	}

	// Add to view
	await db.insert(conversationView).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		viewId,
		addedByAiAgentId: aiAgentId,
		addedByUserId: null,
		createdAt: now,
	});

	// Create timeline event
	await db.insert(conversationTimelineItem).values({
		id: generateShortPrimaryId(),
		conversationId,
		organizationId,
		type: ConversationTimelineType.EVENT,
		visibility: TimelineItemVisibility.PRIVATE, // Private - team only
		text: "AI categorized conversation",
		aiAgentId,
		userId: null,
		visitorId: null,
		createdAt: now,
	});
}
