import { getSafeRedisUrl, type RedisOptions } from "@cossistant/redis";
import { type JobsOptions, Queue } from "bullmq";
import {
	type AiReplyJobData,
	generateAiReplyJobId,
	QUEUE_NAMES,
} from "../types";

const MIN_AI_REPLY_DELAY_MS = 5000;
const AI_REPLY_DEDUP_TTL_MS = 60_000;

type TriggerConfig = {
	connection: RedisOptions;
	redisUrl: string;
};

export function createAiReplyTriggers({ connection, redisUrl }: TriggerConfig) {
	const queueName = QUEUE_NAMES.AI_REPLY;
	let queue: Queue<AiReplyJobData> | null = null;
	let readyPromise: Promise<void> | null = null;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);

	const buildConnectionOptions = (): RedisOptions => ({
		...connection,
		tls: connection.tls ? { ...connection.tls } : undefined,
	});

	function getQueue(): Queue<AiReplyJobData> {
		if (!queue) {
			console.log(
				`[jobs:ai-reply] Using queue=${queueName} redis=${safeRedisUrl}`
			);
			queue = new Queue<AiReplyJobData>(queueName, {
				connection: buildConnectionOptions(),
				defaultJobOptions: {
					removeOnComplete: true,
					removeOnFail: 50,
				},
			});
		}

		return queue;
	}

	async function ensureQueueReady(): Promise<Queue<AiReplyJobData>> {
		const q = getQueue();
		if (!readyPromise) {
			readyPromise = q
				.waitUntilReady()
				.then(() => {
					console.log("[jobs:ai-reply] Queue connection ready for producers");
				})
				.catch((error) => {
					console.error(
						"[jobs:ai-reply] Failed to initialize queue connection",
						error
					);
					throw error;
				});
		}
		await readyPromise;
		return q;
	}

	async function enqueueAiReply(data: AiReplyJobData): Promise<void> {
		const q = await ensureQueueReady();
		const jobId = generateAiReplyJobId(data.conversationId);

		const jobOptions: JobsOptions = {
			jobId,
			delay: MIN_AI_REPLY_DELAY_MS,
			deduplication: {
				id: jobId,
				ttl: AI_REPLY_DEDUP_TTL_MS,
				extend: true,
				replace: true,
			},
		};

		const job = await q.add("ai-reply", data, jobOptions);

		const [state, counts] = await Promise.all([
			job.getState().catch(() => "unknown"),
			q.getJobCounts("delayed", "waiting", "active").catch(() => null),
		]);

		const countSummary = counts
			? `| counts delayed:${counts.delayed} waiting:${counts.waiting} active:${counts.active}`
			: "";

		console.log(
			`[jobs:ai-reply] Enqueued job ${jobId} for conversation ${data.conversationId} (state:${state}) ${countSummary}`
		);
	}

	return {
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
