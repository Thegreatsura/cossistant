import type { RedisOptions } from "@cossistant/redis";
import { getBullConnectionOptions } from "@cossistant/redis";
import { createMessageNotificationWorker } from "./message-notification/worker";

type WorkerInstance = {
	start: () => Promise<void>;
	stop: () => Promise<void>;
};

const workers: WorkerInstance[] = [];

/**
 * Start all queue workers
 */
export async function startAllWorkers(redisUrl: string): Promise<void> {
	console.log("[workers] Starting all workers...");
	const connectionOptions: RedisOptions = getBullConnectionOptions(redisUrl);

	const messageNotificationWorker = createMessageNotificationWorker({
		connectionOptions,
		redisUrl,
	});
	await messageNotificationWorker.start();
	workers.push(messageNotificationWorker);

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
