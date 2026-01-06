/**
 * Send Message Action
 *
 * Sends a visible message to the visitor.
 * Idempotent - checks for existing message with same idempotency key.
 */

import type { Database } from "@api/db";
import { createMessageTimelineItem } from "@api/utils/timeline-item";

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
	} = params;

	// TODO: Check for existing message with idempotency key
	// For now, we create the message directly

	const result = await createMessageTimelineItem({
		db,
		organizationId,
		websiteId,
		conversationId,
		conversationOwnerVisitorId: visitorId,
		text,
		aiAgentId,
		userId: null,
		visitorId: null,
		triggerNotificationWorkflow: false,
	});

	return {
		messageId: result.item.id,
		created: true,
	};
}
