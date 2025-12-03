/**
 * Queue trigger utilities for API
 *
 * Creates job triggers bound to BullMQ connection options. The actual job
 * processing happens in the workers app.
 */

import { env } from "@api/env";
import { createMessageNotificationTriggers } from "@cossistant/jobs";
import { getBullConnectionOptions } from "@cossistant/redis";

// Lazily initialized triggers
let triggers: ReturnType<typeof createMessageNotificationTriggers> | null =
	null;

const bullConnectionOptions = getBullConnectionOptions(env.REDIS_URL);

function getTriggers() {
	if (!triggers) {
		triggers = createMessageNotificationTriggers({
			connection: bullConnectionOptions,
			redisUrl: env.REDIS_URL,
		});
	}
	return triggers;
}

export async function triggerMemberMessageNotification(data: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	senderId: string;
	initialMessageCreatedAt: string;
}): Promise<void> {
	return getTriggers().triggerMemberMessageNotification(data);
}

export async function triggerVisitorMessageNotification(data: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
	initialMessageCreatedAt: string;
}): Promise<void> {
	return getTriggers().triggerVisitorMessageNotification(data);
}

export async function closeQueueProducers(): Promise<void> {
	if (triggers) {
		await triggers.close();
		triggers = null;
	}
}
