/**
 * Queue trigger utilities for API
 *
 * Creates job triggers bound to BullMQ connection options. The actual job
 * processing happens in the workers app.
 */

import { env } from "@api/env";
import {
	createAiReplyTriggers,
	createMessageNotificationTriggers,
} from "@cossistant/jobs";
import { getBullConnectionOptions } from "@cossistant/redis";

// Lazily initialized triggers
let messageNotificationTriggers: ReturnType<
	typeof createMessageNotificationTriggers
> | null = null;
let aiReplyTriggers: ReturnType<typeof createAiReplyTriggers> | null = null;

const bullConnectionOptions = getBullConnectionOptions(env.REDIS_URL);

function getMessageNotificationTriggers() {
	if (!messageNotificationTriggers) {
		messageNotificationTriggers = createMessageNotificationTriggers({
			connection: bullConnectionOptions,
			redisUrl: env.REDIS_URL,
		});
	}
	return messageNotificationTriggers;
}

export function getAiReplyQueueTriggers() {
	if (!aiReplyTriggers) {
		aiReplyTriggers = createAiReplyTriggers({
			connection: bullConnectionOptions,
			redisUrl: env.REDIS_URL,
		});
	}
	return aiReplyTriggers;
}

export async function triggerMemberMessageNotification(data: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	senderId: string;
	initialMessageCreatedAt: string;
}): Promise<void> {
	console.log(
		`[queue-triggers] triggerMemberMessageNotification called for conversation ${data.conversationId}, message ${data.messageId}`
	);
	try {
		await getMessageNotificationTriggers().triggerMemberMessageNotification(
			data
		);
		console.log(
			`[queue-triggers] triggerMemberMessageNotification completed for conversation ${data.conversationId}`
		);
	} catch (error) {
		console.error(
			`[queue-triggers] triggerMemberMessageNotification FAILED for conversation ${data.conversationId}:`,
			error
		);
		throw error;
	}
}

export async function triggerVisitorMessageNotification(data: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
	initialMessageCreatedAt: string;
}): Promise<void> {
	console.log(
		`[queue-triggers] triggerVisitorMessageNotification called for conversation ${data.conversationId}, message ${data.messageId}`
	);
	try {
		await getMessageNotificationTriggers().triggerVisitorMessageNotification(
			data
		);
		console.log(
			`[queue-triggers] triggerVisitorMessageNotification completed for conversation ${data.conversationId}`
		);
	} catch (error) {
		console.error(
			`[queue-triggers] triggerVisitorMessageNotification FAILED for conversation ${data.conversationId}:`,
			error
		);
		throw error;
	}
}

export async function closeQueueProducers(): Promise<void> {
	await Promise.all([
		(async () => {
			if (messageNotificationTriggers) {
				await messageNotificationTriggers.close();
				messageNotificationTriggers = null;
			}
		})(),
		(async () => {
			if (aiReplyTriggers) {
				await aiReplyTriggers.close();
				aiReplyTriggers = null;
			}
		})(),
	]);
}
