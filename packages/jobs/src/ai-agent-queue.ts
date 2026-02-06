import type { Redis } from "@cossistant/redis";

const DEFAULT_QUEUE_TTL_SECONDS = 86_400; // 24h
const DEFAULT_WAKE_TTL_SECONDS = 30; // 30s

const LOCK_RENEW_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

const LOCK_RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

function toScore(createdAt: string | Date | number): number {
	if (typeof createdAt === "number") {
		return createdAt;
	}
	if (createdAt instanceof Date) {
		return createdAt.getTime();
	}
	const parsed = Date.parse(createdAt);
	return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function getAiAgentQueueKey(conversationId: string): string {
	return `ai-agent:queue:${conversationId}`;
}

export function getAiAgentWakeKey(conversationId: string): string {
	return `ai-agent:wake:${conversationId}`;
}

export function getAiAgentLockKey(conversationId: string): string {
	return `ai-agent:lock:${conversationId}`;
}

export function getAiAgentFailureKey(
	conversationId: string,
	messageId: string
): string {
	return `ai-agent:fail:${conversationId}:${messageId}`;
}

function getAiAgentFailurePrefix(conversationId: string): string {
	return `ai-agent:fail:${conversationId}:`;
}

export async function enqueueAiAgentMessage(
	redis: Redis,
	params: {
		conversationId: string;
		messageId: string;
		messageCreatedAt: string | Date | number;
		queueTtlSeconds?: number;
		wakeTtlSeconds?: number;
		setWake?: boolean;
	}
): Promise<{ added: boolean }> {
	const queueKey = getAiAgentQueueKey(params.conversationId);
	const wakeKey = getAiAgentWakeKey(params.conversationId);
	const queueTtl = params.queueTtlSeconds ?? DEFAULT_QUEUE_TTL_SECONDS;
	const wakeTtl = params.wakeTtlSeconds ?? DEFAULT_WAKE_TTL_SECONDS;
	const score = toScore(params.messageCreatedAt);

	const pipeline = redis.multi();
	pipeline.zadd(queueKey, "NX", score.toString(), params.messageId);
	pipeline.expire(queueKey, queueTtl);
	if (params.setWake !== false) {
		pipeline.set(wakeKey, "1", "EX", wakeTtl);
	}

	const results = await pipeline.exec();
	const zaddResult = results?.[0]?.[1];
	return { added: zaddResult === 1 };
}

export async function peekAiAgentQueue(
	redis: Redis,
	conversationId: string
): Promise<string | null> {
	const queueKey = getAiAgentQueueKey(conversationId);
	const entries = await redis.zrange(queueKey, 0, 0);
	return entries?.[0] ?? null;
}

export async function peekAiAgentQueueBatch(
	redis: Redis,
	conversationId: string,
	limit: number
): Promise<string[]> {
	if (limit <= 0) {
		return [];
	}

	const queueKey = getAiAgentQueueKey(conversationId);
	return redis.zrange(queueKey, 0, limit - 1);
}

export async function removeAiAgentQueueMessage(
	redis: Redis,
	conversationId: string,
	messageId: string
): Promise<number> {
	const queueKey = getAiAgentQueueKey(conversationId);
	return redis.zrem(queueKey, messageId);
}

export async function removeAiAgentQueueMessages(
	redis: Redis,
	conversationId: string,
	messageIds: string[]
): Promise<number> {
	if (messageIds.length === 0) {
		return 0;
	}

	const queueKey = getAiAgentQueueKey(conversationId);
	return redis.zrem(queueKey, ...messageIds);
}

export async function getAiAgentQueueSize(
	redis: Redis,
	conversationId: string
): Promise<number> {
	const queueKey = getAiAgentQueueKey(conversationId);
	return redis.zcard(queueKey);
}

export async function clearAiAgentConversationQueue(
	redis: Redis,
	conversationId: string
): Promise<number> {
	const queueKey = getAiAgentQueueKey(conversationId);
	const wakeKey = getAiAgentWakeKey(conversationId);
	return redis.del(queueKey, wakeKey);
}

export async function clearAiAgentConversationFailures(
	redis: Redis,
	conversationId: string
): Promise<number> {
	const prefix = getAiAgentFailurePrefix(conversationId);
	const pattern = `${prefix}*`;
	let removed = 0;
	let cursor = "0";

	do {
		const [nextCursor, keys] = (await redis.scan(
			cursor,
			"MATCH",
			pattern,
			"COUNT",
			"100"
		)) as [string, string[]];
		cursor = nextCursor;

		if (keys.length > 0) {
			removed += await redis.del(...keys);
		}
	} while (cursor !== "0");

	return removed;
}

export async function consumeAiAgentWakeFlag(
	redis: Redis,
	conversationId: string
): Promise<boolean> {
	const wakeKey = getAiAgentWakeKey(conversationId);
	const cleared = await redis.del(wakeKey);
	return cleared === 1;
}

export async function acquireAiAgentLock(
	redis: Redis,
	conversationId: string,
	lockValue: string,
	ttlMs: number
): Promise<boolean> {
	const lockKey = getAiAgentLockKey(conversationId);
	const result = await redis.set(lockKey, lockValue, "PX", ttlMs, "NX");
	return result === "OK";
}

export async function renewAiAgentLock(
	redis: Redis,
	conversationId: string,
	lockValue: string,
	ttlMs: number
): Promise<boolean> {
	const lockKey = getAiAgentLockKey(conversationId);
	const result = await redis.eval(
		LOCK_RENEW_SCRIPT,
		1,
		lockKey,
		lockValue,
		ttlMs
	);
	return result === 1;
}

export async function releaseAiAgentLock(
	redis: Redis,
	conversationId: string,
	lockValue: string
): Promise<boolean> {
	const lockKey = getAiAgentLockKey(conversationId);
	const result = await redis.eval(LOCK_RELEASE_SCRIPT, 1, lockKey, lockValue);
	return result === 1;
}

export const AI_AGENT_QUEUE_DEFAULTS = {
	queueTtlSeconds: DEFAULT_QUEUE_TTL_SECONDS,
	wakeTtlSeconds: DEFAULT_WAKE_TTL_SECONDS,
};
