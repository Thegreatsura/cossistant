/**
 * Send Message Action
 *
 * Sends a visible message to the visitor.
 * Idempotent - uses idempotencyKey as message ID to prevent duplicates.
 */

import type { Database } from "@api/db";
import { conversationTimelineItem } from "@api/db/schema/conversation";
import { generateIdempotentULID } from "@api/utils/db/ids";
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

	// Generate a valid 26-char ULID from the idempotency key
	const messageId = generateIdempotentULID(idempotencyKey);

	console.log(
		`[ai-agent:send-message] conv=${conversationId} | idempotencyKey=${idempotencyKey} | messageId=${messageId}`
	);

	// Check for existing message with this ID
	const existing = await db
		.select({ id: conversationTimelineItem.id })
		.from(conversationTimelineItem)
		.where(eq(conversationTimelineItem.id, messageId))
		.limit(1);

	if (existing.length > 0) {
		console.log(
			`[ai-agent:send-message] conv=${conversationId} | Skipping - message already exists`
		);
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
		id: messageId, // Use deterministic ULID for deduplication
		userId: null,
		visitorId: null,
		triggerNotificationWorkflow: false,
	});

	return {
		messageId: result.item.id,
		created: true,
	};
}
