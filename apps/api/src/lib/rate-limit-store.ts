import { env } from "@api/env";
import { RedisClient } from "bun";
import type { Store } from "hono-rate-limiter";
import RedisStore from "rate-limit-redis";

/**
 * Create a Redis store for hono-rate-limiter using Bun's Redis client
 * This allows us to share rate limit state across multiple instances
 */
export function createRedisRateLimitStore(): Store {
	const redisClient = new RedisClient(env.REDIS_URL);

	// Create the Redis store with Bun's Redis client
	// rate-limit-redis expects specific methods, so we need to adapt
	const store = new RedisStore({
		// Send raw Redis commands through Bun's client
		sendCommand: async (...args: string[]) => {
			try {
				// Bun's Redis client uses .send() for raw commands
				// The first argument is the command, rest are arguments
				const [command, ...commandArgs] = args;
				const result = await redisClient.send(command, commandArgs);
				return result;
			} catch (error) {
				console.error("Redis rate limit command error:", error);
				throw error;
			}
		},
		prefix: "rate-limit:",
	});

	// Return the store cast as hono-rate-limiter Store type
	return store as unknown as Store;
}

/**
 * Create an in-memory fallback store for development
 */
export function createMemoryRateLimitStore(): Store {
	// This will use the default MemoryStore from hono-rate-limiter
	return undefined as unknown as Store; // Let hono-rate-limiter use its default
}

/**
 * Get the appropriate rate limit store based on environment
 */
export function getRateLimitStore(): Store | undefined {
	// Use Redis in production, memory store in development
	if (env.NODE_ENV === "production" || env.REDIS_URL) {
		try {
			return createRedisRateLimitStore();
		} catch (error) {
			console.error("Failed to create Redis rate limit store:", error);
			console.warn("Falling back to memory store");
			return; // Fall back to default memory store
		}
	}

	// In development without Redis, use memory store
	return; // Use default memory store
}
