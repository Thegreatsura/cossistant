/**
 * Send Message Action
 *
 * Sends a visible message to the visitor.
 * Idempotent - uses idempotencyKey as message ID to prevent duplicates.
 */

import type { Database } from "@api/db";
import { conversationTimelineItem } from "@api/db/schema/conversation";
import { createMessageTimelineItem } from "@api/utils/timeline-item";
import { eq } from "drizzle-orm";

type SendMessageParams = {
	db: Database;
	conversationId: string;
	organizationId: string;
	websiteId: string;
	visitorId: string;
	aiAgentId: string;
	text: string;
	idempotencyKey: string;
};

type SendMessageResult = {
	messageId: string;
	created: boolean;
};

/**
 * Send a visible message to the visitor
 */
export async function sendMessage(
	params: SendMessageParams
): Promise<SendMessageResult> {
	const {
		db,
		conversationId,
		organizationId,
		websiteId,
		visitorId,
		aiAgentId,
		text,
		idempotencyKey,
	} = params;

	// Check for existing message with this idempotency key (used as ID)
	const existing = await db
		.select({ id: conversationTimelineItem.id })
		.from(conversationTimelineItem)
		.where(eq(conversationTimelineItem.id, idempotencyKey))
		.limit(1);

	if (existing.length > 0) {
		return {
			messageId: existing[0].id,
			created: false,
		};
	}

	const result = await createMessageTimelineItem({
		db,
		organizationId,
		websiteId,
		conversationId,
		conversationOwnerVisitorId: visitorId,
		text,
		aiAgentId,
		id: idempotencyKey, // Use idempotency key as ID for deduplication
		userId: null,
		visitorId: null,
		triggerNotificationWorkflow: false,
	});

	return {
		messageId: result.item.id,
		created: true,
	};
}
