import { env } from "@api/env";
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export function getRedis(): RedisClientType {
  if (!client) {
    client = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 30_000),
      },
    });
    client.on("error", (error) => {
      console.error("[redis] error", error);
    });
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch((error) => {
      console.error("[redis] connect error", error);
      throw error;
    });
  }

  return client;
}

export async function waitForRedis(): Promise<RedisClientType> {
  const redis = getRedis();
  if (connectPromise) {
    await connectPromise.catch(() => {});
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (!client) {
    return;
  }

  try {
    await client.quit().catch(() => {});
  } finally {
    client = null;
    connectPromise = null;
  }
}
