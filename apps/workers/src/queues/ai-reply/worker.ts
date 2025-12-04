import { markConversationAsSeen } from "@api/db/mutations/conversation";
import { getAiAgentById, updateAiAgentUsage } from "@api/db/queries/ai-agent";
import { getConversationById } from "@api/db/queries/conversation";
import {
	emitConversationSeenEvent,
	emitConversationTypingEvent,
} from "@api/utils/conversation-realtime";
import { createMessageTimelineItem } from "@api/utils/timeline-item";
import { generateAIResponse } from "@api/workflows/ai-agent/ai-generator";
import {
	buildConversationHistory,
	buildVisitorContextPrompt,
	getVisitorContextInfo,
} from "@api/workflows/ai-agent/context-builder";
import { getToolsForAgent } from "@api/workflows/ai-agent/tools";
import { type AiReplyJobData, QUEUE_NAMES } from "@cossistant/jobs";
import {
	clearWorkflowState,
	isWorkflowRunActive,
	type WorkflowDirection,
} from "@cossistant/jobs/workflow-state";
import {
	getSafeRedisUrl,
	type Redis,
	type RedisOptions,
} from "@cossistant/redis";
import { db } from "@workers/db";
import { type Job, Queue, QueueEvents, Worker } from "bullmq";

const AI_REPLY_DIRECTION: WorkflowDirection = "ai-agent-response";

type WorkerConfig = {
	connectionOptions: RedisOptions;
	redisUrl: string;
	stateRedis: Redis;
};

export function createAiReplyWorker({
	connectionOptions,
	redisUrl,
	stateRedis,
}: WorkerConfig) {
	const queueName = QUEUE_NAMES.AI_REPLY;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);
	let worker: Worker<AiReplyJobData> | null = null;
	let events: QueueEvents | null = null;
	let maintenanceQueue: Queue<AiReplyJobData> | null = null;

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
				`[worker:ai-reply] Using queue=${queueName} redis=${safeRedisUrl}`
			);

			maintenanceQueue = new Queue<AiReplyJobData>(queueName, {
				connection: buildConnectionOptions(),
			});
			await maintenanceQueue.waitUntilReady();

			events = new QueueEvents(queueName, {
				connection: buildConnectionOptions(),
			});
			events.on("waiting", ({ jobId }) => {
				console.log(`[worker:ai-reply] Job ${jobId} waiting`);
			});
			events.on("active", ({ jobId }) => {
				console.log(`[worker:ai-reply] Job ${jobId} active`);
			});
			events.on("failed", ({ jobId, failedReason }) => {
				console.error(`[worker:ai-reply] Job ${jobId} failed: ${failedReason}`);
			});
			await events.waitUntilReady();

			worker = new Worker<AiReplyJobData>(
				queueName,
				async (job: Job<AiReplyJobData>) => {
					const start = Date.now();
					console.log(
						`[worker:ai-reply] Executing job ${job.id} | conversation: ${job.data.conversationId} | agent: ${job.data.aiAgentId} | replacement: ${job.data.isReplacement}`
					);

					try {
						await processAiReplyJob(stateRedis, job);
						const duration = Date.now() - start;
						console.log(
							`[worker:ai-reply] Completed job ${job.id} in ${duration}ms`
						);
					} catch (error) {
						const duration = Date.now() - start;
						console.error(
							`[worker:ai-reply] Failed job ${job.id} after ${duration}ms`,
							error
						);
						throw error;
					}
				},
				{
					connection: buildConnectionOptions(),
					concurrency: 5,
				}
			);

			worker.on("error", (error) => {
				console.error("[worker:ai-reply] Worker error", error);
			});

			await worker.waitUntilReady();
			console.log("[worker:ai-reply] Worker started");
		},
		stop: async () => {
			await Promise.all([
				(async () => {
					if (worker) {
						await worker.close();
						worker = null;
						console.log("[worker:ai-reply] Worker stopped");
					}
				})(),
				(async () => {
					if (events) {
						await events.close();
						events = null;
						console.log("[worker:ai-reply] Queue events stopped");
					}
				})(),
				(async () => {
					if (maintenanceQueue) {
						await maintenanceQueue.close();
						maintenanceQueue = null;
						console.log("[worker:ai-reply] Maintenance queue closed");
					}
				})(),
			]);
		},
	};

	async function processAiReplyJob(
		redis: Redis,
		job: Job<AiReplyJobData>
	): Promise<void> {
		const {
			conversationId,
			organizationId,
			websiteId,
			visitorId,
			aiAgentId,
			workflowRunId,
		} = job.data;

		const active = await isWorkflowRunActive(
			redis,
			conversationId,
			AI_REPLY_DIRECTION,
			workflowRunId
		);

		if (!active) {
			console.log(
				`[worker:ai-reply] Job ${job.id} is no longer active for conversation ${conversationId}, skipping`
			);
			return;
		}

		const aiAgent = await getAiAgentById(db, { aiAgentId });

		if (!aiAgent?.isActive) {
			console.log(
				`[worker:ai-reply] AI agent ${aiAgentId} unavailable for conversation ${conversationId}`
			);
			await clearWorkflowState(redis, conversationId, AI_REPLY_DIRECTION);
			return;
		}

		const conversation = await getConversationById(db, { conversationId });

		if (!conversation) {
			console.error(
				`[worker:ai-reply] Conversation ${conversationId} not found`
			);
			await clearWorkflowState(redis, conversationId, AI_REPLY_DIRECTION);
			return;
		}

		const actor = { type: "ai_agent" as const, aiAgentId: aiAgent.id };
		const lastSeenAt = await markConversationAsSeen(db, {
			conversation,
			actor,
		});

		await emitConversationSeenEvent({
			conversation,
			actor,
			lastSeenAt,
		});

		await emitConversationTypingEvent({
			conversation,
			actor,
			isTyping: true,
		});

		try {
			const [conversationHistory, visitorInfo] = await Promise.all([
				buildConversationHistory(db, {
					conversationId,
					websiteId,
					organizationId,
					visitorId,
				}),
				getVisitorContextInfo(db, visitorId),
			]);

			const visitorContextPrompt = buildVisitorContextPrompt(visitorInfo);
			const enhancedAgent = {
				...aiAgent,
				basePrompt: aiAgent.basePrompt + visitorContextPrompt,
			};

			const tools = getToolsForAgent(
				aiAgent.metadata as Record<string, unknown> | null
			);

			const result = await generateAIResponse({
				aiAgent: enhancedAgent,
				conversationHistory,
				tools,
			});

			await createMessageTimelineItem({
				db,
				organizationId,
				websiteId,
				conversationId,
				conversationOwnerVisitorId: visitorId,
				text: result.text,
				aiAgentId: aiAgent.id,
				userId: null,
				visitorId: null,
				triggerNotificationWorkflow: false,
			});

			await updateAiAgentUsage(db, { aiAgentId: aiAgent.id });

			console.log(
				`[worker:ai-reply] Generated response for conversation ${conversationId}`,
				{
					aiAgentId: aiAgent.id,
					tokensUsed: result.usage?.totalTokens,
				}
			);
		} finally {
			await emitConversationTypingEvent({
				conversation,
				actor,
				isTyping: false,
			});

			await clearWorkflowState(redis, conversationId, AI_REPLY_DIRECTION);
		}
	}
}
