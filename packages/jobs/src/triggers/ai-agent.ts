/**
 * AI Agent Job Triggers
 *
 * This module provides functions to enqueue AI agent jobs.
 * The AI agent can respond to visitors, analyze conversations,
 * escalate to humans, and execute background tasks.
 */

import { getSafeRedisUrl, type RedisOptions } from "@cossistant/redis";
import { Queue } from "bullmq";
import {
	type AiAgentJobData,
	generateAiAgentJobId,
	QUEUE_NAMES,
} from "../types";
import { addDebouncedJob } from "../utils/debounced-job";

/**
 * Minimum delay before AI agent processes a message (ms)
 * This prevents immediate responses that feel unnatural
 */
const MIN_AI_AGENT_DELAY_MS = 3000;

/**
 * Retry configuration for AI agent jobs
 * 5 attempts with exponential backoff over ~2.5 hours
 */
const AI_RETRY_ATTEMPTS = 5;
const AI_RETRY_BASE_DELAY_MS = 5000; // 5s, 10s, 20s, 40s, 80s

type TriggerConfig = {
	connection: RedisOptions;
	redisUrl: string;
};

export function createAiAgentTriggers({ connection, redisUrl }: TriggerConfig) {
	const queueName = QUEUE_NAMES.AI_AGENT;
	let queue: Queue<AiAgentJobData> | null = null;
	let readyPromise: Promise<void> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	const buildConnectionOptions = (): RedisOptions => ({
		...connection,
		tls: connection.tls ? { ...connection.tls } : undefined,
	});

	function getQueue(): Queue<AiAgentJobData> {
		if (!queue) {
			console.log(
				`[jobs:ai-agent] Using queue=${queueName} redis=${safeRedisUrl}`
			);
			queue = new Queue<AiAgentJobData>(queueName, {
				connection: buildConnectionOptions(),
				defaultJobOptions: {
					removeOnComplete: { count: 1000 }, // Keep last 1000 completed
					removeOnFail: { count: 5000 }, // Keep failed for debugging
				},
			});
		}

		return queue;
	}

	async function ensureQueueReady(): Promise<Queue<AiAgentJobData>> {
		const q = getQueue();
		if (!readyPromise) {
			readyPromise = q
				.waitUntilReady()
				.then(() => {
					console.log("[jobs:ai-agent] Queue connection ready for producers");
				})
				.catch((error) => {
					console.error(
						"[jobs:ai-agent] Failed to initialize queue connection",
						error
					);
					throw error;
				});
		}
		await readyPromise;
		return q;
	}

	/**
	 * Enqueue an AI agent job
	 *
	 * The job will be processed by the AI agent worker which runs
	 * the 5-step pipeline (intake, decision, generation, execution, followup).
	 *
	 * Uses debouncing: if a job for the same conversation is already queued,
	 * the new message will be picked up when the existing job runs.
	 */
	async function enqueueAiAgentJob(data: AiAgentJobData): Promise<void> {
		const q = await ensureQueueReady();
		const jobId = generateAiAgentJobId(data.conversationId);

		const result = await addDebouncedJob({
			queue: q,
			jobId,
			jobName: "ai-agent",
			data,
			options: {
				delay: MIN_AI_AGENT_DELAY_MS,
				attempts: AI_RETRY_ATTEMPTS,
				backoff: {
					type: "exponential",
					delay: AI_RETRY_BASE_DELAY_MS,
				},
			},
			logPrefix: "[jobs:ai-agent]",
		});

		// If skipped due to debouncing, no need to log further
		if (result.status === "skipped") {
			console.log(
				`[jobs:ai-agent] Job ${jobId} skipped for conversation ${data.conversationId} (${result.reason}, state: ${result.existingState})`
			);
			return;
		}

		// Log job creation/replacement
		const [state, counts] = await Promise.all([
			result.job.getState().catch(() => "unknown"),
			q.getJobCounts("delayed", "waiting", "active").catch(() => null),
		]);

		const countSummary = counts
			? `| counts delayed:${counts.delayed} waiting:${counts.waiting} active:${counts.active}`
			: "";

		const action =
			result.status === "replaced"
				? `replaced (was ${result.previousState})`
				: "created";

		console.log(
			`[jobs:ai-agent] Job ${result.job.id} ${action} for conversation ${data.conversationId} (state:${state}) ${countSummary}`
		);
	}

	/**
	 * @deprecated Use enqueueAiAgentJob instead
	 */
	const enqueueAiReply = enqueueAiAgentJob;

	return {
		enqueueAiAgentJob,
		enqueueAiReply,
		close: async (): Promise<void> => {
			if (queue) {
				await queue.close();
				queue = null;
				readyPromise = null;
			}
		},
	};
}

/**
 * @deprecated Use createAiAgentTriggers instead
 */
export const createAiReplyTriggers = createAiAgentTriggers;
