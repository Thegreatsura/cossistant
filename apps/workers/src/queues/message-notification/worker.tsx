import {
	getMemberNotificationPreference,
	getMessagesForEmail,
	getNotificationData,
	getVisitorEmailForNotification,
	isVisitorEmailNotificationEnabled,
} from "@cossistant/api/notification-helpers";
import { type MessageNotificationJobData, QUEUE_NAMES } from "@cossistant/jobs";
import { getSafeRedisUrl, type RedisOptions } from "@cossistant/redis";
import { NewMessageInConversation, sendEmail } from "@cossistant/transactional";
import { type Job, Queue, QueueEvents, Worker } from "bullmq";
import React from "react";
import { db } from "../../db";

// Constants
const MAX_MESSAGES_IN_EMAIL = 3;

type MemberRecipient = {
	kind: "member";
	userId: string;
	memberId: string;
	email: string;
};

type VisitorRecipient = {
	kind: "visitor";
	visitorId: string;
	email: string;
};

/**
 * Create the message notification worker
 */
const DELAY_PROMOTION_INTERVAL_MS = 5000;

type WorkerConfig = {
	connectionOptions: RedisOptions;
	redisUrl: string;
};

export function createMessageNotificationWorker({
	connectionOptions,
	redisUrl,
}: WorkerConfig) {
	const queueName = QUEUE_NAMES.MESSAGE_NOTIFICATION;
	let worker: Worker<MessageNotificationJobData> | null = null;
	let maintenanceQueue: Queue<MessageNotificationJobData> | null = null;
	let events: QueueEvents | null = null;
	let delayedPromotionInterval: ReturnType<typeof setInterval> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	const buildConnectionOptions = (): RedisOptions => ({
		...connectionOptions,
		tls: connectionOptions.tls ? { ...connectionOptions.tls } : undefined,
	});

	return {
		start: async () => {
			if (worker) {
				return;
			}

			console.log(
				`[worker:message-notification] Using queue=${queueName} redis=${safeRedisUrl}`
			);
			console.log(
				"[worker:message-notification] Initializing maintenance queue"
			);
			maintenanceQueue = new Queue<MessageNotificationJobData>(queueName, {
				connection: buildConnectionOptions(),
			});
			await maintenanceQueue.waitUntilReady();
			console.log("[worker:message-notification] Maintenance queue ready");

			console.log("[worker:message-notification] Initializing queue events");
			events = new QueueEvents(queueName, {
				connection: buildConnectionOptions(),
			});
			events.on("delayed", ({ jobId, delay }) => {
				console.log(
					`[worker:message-notification] Job ${jobId} delayed for ${delay}ms`
				);
			});
			events.on("waiting", ({ jobId }) => {
				console.log(`[worker:message-notification] Job ${jobId} waiting`);
			});
			events.on("active", ({ jobId }) => {
				console.log(`[worker:message-notification] Job ${jobId} active`);
			});
			events.on("completed", ({ jobId }) => {
				console.log(`[worker:message-notification] Job ${jobId} completed`);
			});
			events.on("failed", ({ jobId, failedReason }) => {
				console.error(
					`[worker:message-notification] Job ${jobId} failed: ${failedReason}`
				);
			});
			await events.waitUntilReady();
			console.log("[worker:message-notification] Queue events ready");

			worker = new Worker<MessageNotificationJobData>(
				queueName,
				async (job: Job<MessageNotificationJobData>) => {
					const startTime = Date.now();
					console.log(
						`[worker:message-notification] Executing job ${job.id} | conversation: ${job.data.conversationId} | direction: ${job.data.direction} | message: ${job.data.messageId}`
					);

					try {
						await processMessageNotification(job.data);
						const duration = Date.now() - startTime;
						console.log(
							`[worker:message-notification] Completed job ${job.id} in ${duration}ms`
						);
					} catch (error) {
						const duration = Date.now() - startTime;
						console.error(
							`[worker:message-notification] Failed job ${job.id} after ${duration}ms:`,
							error
						);
						throw error;
					}
				},
				{
					connection: buildConnectionOptions(),
					concurrency: 10,
				}
			);

			worker.on("failed", (job, err) => {
				console.error(
					`[worker:message-notification] Job ${job?.id} failed:`,
					err.message
				);
			});

			worker.on("error", (err) => {
				console.error("[worker:message-notification] Worker error:", err);
			});

			delayedPromotionInterval = setInterval(() => {
				if (!maintenanceQueue) {
					return;
				}
				maintenanceQueue
					.getJobCounts("delayed", "waiting")
					.then(async (counts) => {
						if (counts.delayed === 0) {
							return;
						}
						await maintenanceQueue?.promoteJobs();
						console.log(
							`[worker:message-notification] Promoted delayed jobs (before:${counts.delayed}) wait:${counts.waiting}`
						);
					})
					.catch((error) => {
						console.error(
							"[worker:message-notification] Failed promoting delayed jobs",
							error
						);
					});
			}, DELAY_PROMOTION_INTERVAL_MS);

			await worker.waitUntilReady();
			console.log("[worker:message-notification] Worker started");
		},

		stop: async () => {
			await Promise.all([
				(async () => {
					if (worker) {
						await worker.close();
						worker = null;
						console.log("[worker:message-notification] Worker stopped");
					}
				})(),
				(async () => {
					if (events) {
						await events.close();
						events = null;
						console.log("[worker:message-notification] Queue events stopped");
					}
				})(),
				(async () => {
					if (maintenanceQueue) {
						await maintenanceQueue.close();
						maintenanceQueue = null;
						console.log(
							"[worker:message-notification] Maintenance queue closed"
						);
					}
				})(),
			]);

			if (delayedPromotionInterval) {
				clearInterval(delayedPromotionInterval);
				delayedPromotionInterval = null;
				console.log("[worker:message-notification] Promotion loop stopped");
			}
		},
	};
}

/**
 * Process a message notification job
 */
async function processMessageNotification(
	data: MessageNotificationJobData
): Promise<void> {
	const {
		conversationId,
		websiteId,
		organizationId,
		direction,
		senderId,
		initialMessageCreatedAt,
	} = data;

	// Fetch notification data using API helpers
	const { conversation, websiteInfo, participants } = await getNotificationData(
		db,
		{
			conversationId,
			websiteId,
			organizationId,
			excludeUserId: direction === "member-to-visitor" ? senderId : undefined,
		}
	);

	if (!(conversation && websiteInfo)) {
		console.log(
			`[worker:message-notification] Conversation or website not found for ${conversationId}`
		);
		return;
	}

	// Send emails to member recipients
	for (const participant of participants) {
		const recipient: MemberRecipient = {
			kind: "member",
			userId: participant.userId,
			memberId: participant.memberId,
			email: participant.userEmail,
		};

		await sendMemberEmailNotification({
			recipient,
			conversationId,
			organizationId,
			websiteInfo: {
				name: websiteInfo.name,
				slug: websiteInfo.slug,
				logo: websiteInfo.logo,
			},
			initialMessageCreatedAt,
		});
	}

	// If member sent message, also notify visitor
	if (direction === "member-to-visitor" && conversation.visitorId) {
		const visitorInfo = await getVisitorEmailForNotification(db, {
			visitorId: conversation.visitorId,
			websiteId,
		});

		if (visitorInfo?.contactEmail) {
			const visitorNotificationsEnabled =
				await isVisitorEmailNotificationEnabled(db, {
					visitorId: conversation.visitorId,
					websiteId,
				});

			if (visitorNotificationsEnabled) {
				const recipient: VisitorRecipient = {
					kind: "visitor",
					visitorId: conversation.visitorId,
					email: visitorInfo.contactEmail,
				};

				await sendVisitorEmailNotification({
					recipient,
					conversationId,
					organizationId,
					websiteInfo: {
						name: websiteInfo.name,
						slug: websiteInfo.slug,
						logo: websiteInfo.logo,
					},
					initialMessageCreatedAt,
				});
			}
		}
	}
}

// ============================================================================
// Email sending helpers
// ============================================================================

async function sendMemberEmailNotification(params: {
	recipient: MemberRecipient;
	conversationId: string;
	organizationId: string;
	websiteInfo: { name: string; slug: string; logo: string | null };
	initialMessageCreatedAt: string;
}): Promise<void> {
	const {
		recipient,
		conversationId,
		organizationId,
		websiteInfo,
		initialMessageCreatedAt,
	} = params;

	if (!recipient.email) {
		return;
	}

	// Check preferences using API helper
	const preference = await getMemberNotificationPreference(db, {
		memberId: recipient.memberId,
		organizationId,
	});

	if (preference !== undefined && !preference.enabled) {
		return;
	}

	// Get messages using API helper
	const { messages, totalCount } = await getMessagesForEmail(db, {
		conversationId,
		organizationId,
		recipientUserId: recipient.userId,
		maxMessages: MAX_MESSAGES_IN_EMAIL,
		earliestCreatedAt: initialMessageCreatedAt,
	});

	if (messages.length === 0) {
		return;
	}

	// Send email
	await sendEmail(
		{
			to: recipient.email,
			subject:
				totalCount > 1
					? `${totalCount} new messages from ${websiteInfo.name}`
					: `New message from ${websiteInfo.name}`,
			react: (
				<NewMessageInConversation
					conversationId={conversationId}
					email={recipient.email}
					isReceiverVisitor={false}
					messages={messages}
					totalCount={totalCount}
					website={websiteInfo}
				/>
			),
			variant: "notifications",
		},
		{}
	);

	console.log(
		`[worker:message-notification] Sent email to member ${recipient.memberId}`
	);
}

async function sendVisitorEmailNotification(params: {
	recipient: VisitorRecipient;
	conversationId: string;
	organizationId: string;
	websiteInfo: { name: string; slug: string; logo: string | null };
	initialMessageCreatedAt: string;
}): Promise<void> {
	const {
		recipient,
		conversationId,
		organizationId,
		websiteInfo,
		initialMessageCreatedAt,
	} = params;

	if (!recipient.email) {
		return;
	}

	// Get messages using API helper
	const { messages, totalCount } = await getMessagesForEmail(db, {
		conversationId,
		organizationId,
		recipientVisitorId: recipient.visitorId,
		maxMessages: MAX_MESSAGES_IN_EMAIL,
		earliestCreatedAt: initialMessageCreatedAt,
	});

	if (messages.length === 0) {
		return;
	}

	// Send email
	await sendEmail(
		{
			to: recipient.email,
			subject:
				totalCount > 1
					? `${totalCount} new messages from ${websiteInfo.name}`
					: `New message from ${websiteInfo.name}`,
			react: (
				<NewMessageInConversation
					conversationId={conversationId}
					email={recipient.email}
					isReceiverVisitor={true}
					messages={messages}
					totalCount={totalCount}
					website={websiteInfo}
				/>
			),
			variant: "notifications",
		},
		{}
	);

	console.log(
		`[worker:message-notification] Sent email to visitor ${recipient.visitorId}`
	);
}
