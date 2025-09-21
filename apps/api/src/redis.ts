import { env } from "@api/env";
import Redis from "ioredis";

let client: Redis | null = null;
let connectPromise: Promise<void> | null = null;

export function getRedis(): Redis {
	if (!client) {
		client = new Redis(`${env.REDIS_URL}?family=0`, {
			lazyConnect: true,
			enableAutoPipelining: true,
			maxRetriesPerRequest: null,
			retryStrategy: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
			reconnectOnError: (error) => {
				console.error("[redis] reconnect on error", error);
				return true;
			},
		});
		client.on("error", (error) => {
			console.error("[redis] error", error);
		});
	}

	if (!connectPromise && client.status === "wait") {
		const promise = client.connect();
		connectPromise = promise
			.catch((error) => {
				console.error("[redis] connect error", error);
				throw error;
			})
			.finally(() => {
				if (connectPromise === promise) {
					connectPromise = null;
				}
			});
	}

	return client;
}

export async function waitForRedis(): Promise<Redis> {
	const redis = getRedis();
	if (redis.status === "ready") {
		return redis;
	}

	if (connectPromise) {
		await connectPromise;
		return redis;
	}

	if (redis.status === "wait") {
		const promise = redis.connect();
		connectPromise = promise
			.catch((error) => {
				console.error("[redis] connect error", error);
				throw error;
			})
			.finally(() => {
				if (connectPromise === promise) {
					connectPromise = null;
				}
			});
		await connectPromise;
	}

	return redis;
}

export async function closeRedis(): Promise<void> {
	if (!client) {
		return;
	}

	try {
		await client.quit();
	} catch (error) {
		console.error("[redis] quit error", error);
	} finally {
		client = null;
		connectPromise = null;
	}
}
