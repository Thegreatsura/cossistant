import type { Redis, RedisOptions } from "@cossistant/redis";
import { getBullConnectionOptions } from "@cossistant/redis";
import { createAiReplyWorker } from "./ai-reply/worker";
import { createMessageNotificationWorker } from "./message-notification/worker";

type WorkerInstance = {
	start: () => Promise<void>;
	stop: () => Promise<void>;
};

const workers: WorkerInstance[] = [];

/**
 * Start all queue workers
 */
export async function startAllWorkers(params: {
	redisUrl: string;
	stateRedis: Redis;
}): Promise<void> {
	console.log("[workers] Starting all workers...");
	const connectionOptions: RedisOptions = getBullConnectionOptions(
		params.redisUrl
	);

	const messageNotificationWorker = createMessageNotificationWorker({
		connectionOptions,
		redisUrl: params.redisUrl,
	});
	await messageNotificationWorker.start();
	workers.push(messageNotificationWorker);

	const aiReplyWorker = createAiReplyWorker({
		connectionOptions,
		redisUrl: params.redisUrl,
		stateRedis: params.stateRedis,
	});
	await aiReplyWorker.start();
	workers.push(aiReplyWorker);

	console.log("[workers] All workers started");
}

/**
 * Stop all queue workers gracefully
 */
export async function stopAllWorkers(): Promise<void> {
	console.log("[workers] Stopping all workers...");

	await Promise.all(workers.map((w) => w.stop()));

	console.log("[workers] All workers stopped");
}
