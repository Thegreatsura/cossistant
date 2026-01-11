/**
 * Queue trigger utilities for API
 *
 * Creates job triggers bound to BullMQ connection options. The actual job
 * processing happens in the workers app.
 */

import { env } from "@api/env";
import {
	createAiAgentTriggers,
	createMessageNotificationTriggers,
	createWebCrawlTriggers,
	type WebCrawlJobData,
} from "@cossistant/jobs";
import { getBullConnectionOptions } from "@cossistant/redis";

// Lazily initialized triggers
let messageNotificationTriggers: ReturnType<
	typeof createMessageNotificationTriggers
> | null = null;
let aiAgentTriggers: ReturnType<typeof createAiAgentTriggers> | null = null;
let webCrawlTriggers: ReturnType<typeof createWebCrawlTriggers> | null = null;

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

export function getAiAgentQueueTriggers() {
	if (!aiAgentTriggers) {
		aiAgentTriggers = createAiAgentTriggers({
			connection: bullConnectionOptions,
			redisUrl: env.REDIS_URL,
		});
	}
	return aiAgentTriggers;
}

function getWebCrawlTriggers() {
	if (!webCrawlTriggers) {
		webCrawlTriggers = createWebCrawlTriggers({
			connection: bullConnectionOptions,
			redisUrl: env.REDIS_URL,
		});
	}
	return webCrawlTriggers;
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

export async function triggerWebCrawl(data: WebCrawlJobData): Promise<string> {
	console.log(
		`[queue-triggers] triggerWebCrawl called for link source ${data.linkSourceId}, url ${data.url}`
	);
	try {
		const jobId = await getWebCrawlTriggers().enqueueWebCrawl(data);
		console.log(
			`[queue-triggers] triggerWebCrawl completed for link source ${data.linkSourceId}, jobId ${jobId}`
		);
		return jobId;
	} catch (error) {
		console.error(
			`[queue-triggers] triggerWebCrawl FAILED for link source ${data.linkSourceId}:`,
			error
		);
		throw error;
	}
}

export async function cancelWebCrawl(linkSourceId: string): Promise<boolean> {
	console.log(
		`[queue-triggers] cancelWebCrawl called for link source ${linkSourceId}`
	);
	try {
		const cancelled = await getWebCrawlTriggers().cancelWebCrawl(linkSourceId);
		console.log(
			`[queue-triggers] cancelWebCrawl completed for link source ${linkSourceId}, cancelled: ${cancelled}`
		);
		return cancelled;
	} catch (error) {
		console.error(
			`[queue-triggers] cancelWebCrawl FAILED for link source ${linkSourceId}:`,
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
			if (aiAgentTriggers) {
				await aiAgentTriggers.close();
				aiAgentTriggers = null;
			}
		})(),
		(async () => {
			if (webCrawlTriggers) {
				await webCrawlTriggers.close();
				webCrawlTriggers = null;
			}
		})(),
	]);
}
