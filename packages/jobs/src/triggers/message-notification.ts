import { getSafeRedisUrl, type RedisOptions } from "@cossistant/redis";
import { type JobsOptions, Queue } from "bullmq";
import {
	generateMessageNotificationJobId,
	type MessageNotificationDirection,
	type MessageNotificationJobData,
	QUEUE_NAMES,
} from "../types";

// Default delay: 1 minute (in milliseconds)
const DEFAULT_NOTIFICATION_DELAY_MS = 60 * 1000;

type TriggerConfig = {
	connection: RedisOptions;
	redisUrl: string;
};

/**
 * Create message notification queue triggers bound to BullMQ connection options
 */
export function createMessageNotificationTriggers({
	connection,
	redisUrl,
}: TriggerConfig) {
	const queueName = QUEUE_NAMES.MESSAGE_NOTIFICATION;
	let queue: Queue<MessageNotificationJobData> | null = null;
	let readyPromise: Promise<void> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	const buildConnectionOptions = (): RedisOptions => ({
		...connection,
		tls: connection.tls ? { ...connection.tls } : undefined,
	});

	function getQueue(): Queue<MessageNotificationJobData> {
		if (!queue) {
			console.log(
				`[jobs:message-notification] Using queue=${queueName} redis=${safeRedisUrl}`
			);
			queue = new Queue<MessageNotificationJobData>(queueName, {
				connection: buildConnectionOptions(),
				defaultJobOptions: {
					removeOnComplete: true,
					removeOnFail: 100,
				},
			});
		}
		return queue;
	}

	async function ensureQueueReady(): Promise<
		Queue<MessageNotificationJobData>
	> {
		const q = getQueue();
		if (!readyPromise) {
			readyPromise = q
				.waitUntilReady()
				.then(() => {
					console.log(
						"[jobs:message-notification] Queue connection ready for producers"
					);
				})
				.catch((error) => {
					console.error(
						"[jobs:message-notification] Failed to ready message notification queue",
						error
					);
					throw error;
				});
		}
		await readyPromise;
		return q;
	}

	async function addJob(
		data: MessageNotificationJobData,
		direction: MessageNotificationDirection
	): Promise<void> {
		const q = await ensureQueueReady();
		const jobId = generateMessageNotificationJobId(
			data.conversationId,
			direction
		);

		const jobOptions: JobsOptions = {
			jobId,
			delay: DEFAULT_NOTIFICATION_DELAY_MS,
		};

		// BullMQ handles deduplication via jobId - if a job with this ID already exists,
		// it won't create a duplicate. The initialMessageCreatedAt in the job data
		// preserves when the first message was created.
		const job = await q.add("notification", data, jobOptions);

		const [state, counts] = await Promise.all([
			job.getState().catch(() => "unknown"),
			q.getJobCounts("delayed", "waiting", "active").catch(() => null),
		]);

		const countSummary = counts
			? `| counts delayed:${counts.delayed} waiting:${counts.waiting} active:${counts.active}`
			: "";

		console.log(
			`[jobs:message-notification] Triggered job ${jobId} for conversation ${data.conversationId} (direction: ${direction}, delay: ${DEFAULT_NOTIFICATION_DELAY_MS}ms, state: ${state}) ${countSummary}`
		);
	}

	return {
		/**
		 * Trigger a delayed email notification when a member sends a message
		 */
		triggerMemberMessageNotification: async (data: {
			conversationId: string;
			messageId: string;
			websiteId: string;
			organizationId: string;
			senderId: string;
			initialMessageCreatedAt: string;
		}): Promise<void> => {
			const direction: MessageNotificationDirection = "member-to-visitor";
			await addJob({ ...data, direction }, direction);
		},

		/**
		 * Trigger a delayed email notification when a visitor sends a message
		 */
		triggerVisitorMessageNotification: async (data: {
			conversationId: string;
			messageId: string;
			websiteId: string;
			organizationId: string;
			visitorId: string;
			initialMessageCreatedAt: string;
		}): Promise<void> => {
			const direction: MessageNotificationDirection = "visitor-to-member";
			await addJob({ ...data, direction }, direction);
		},

		/**
		 * Close the queue producer connection
		 */
		close: async (): Promise<void> => {
			if (queue) {
				await queue.close();
				queue = null;
				readyPromise = null;
			}
		},
	};
}
