import { env } from "@api/env";
import type {
	RealtimeEvent,
	RealtimeEventData,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";
import { Redis } from "@upstash/redis";
import { ulid } from "ulid";

/**
 * Server instance ID for identifying which server owns which connections
 */
const SERVER_ID = ulid();

/**
 * Redis client for general operations and publishing
 */
const redis = new Redis({
	url: env.UPSTASH_REDIS_REST_URL,
	token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Channel prefix for pub/sub events
 */
const CHANNEL_PREFIX = "cossistant:events";

/**
 * Connection registry TTL (30 seconds)
 * Connections must heartbeat more frequently than this
 */
const CONNECTION_TTL_SECONDS = 30;

/**
 * Generate channel names
 */
function getVisitorChannelName(conversationId: string): string {
	return `${CHANNEL_PREFIX}:visitor:conversation:${conversationId}`;
}

function getDashboardChannelName(websiteId: string): string {
	return `${CHANNEL_PREFIX}:dashboard:website:${websiteId}`;
}

function getConnectionChannelName(connectionId: string): string {
	return `${CHANNEL_PREFIX}:connection:${connectionId}`;
}

/**
 * Publish target options
 */
export type PublishTarget = {
	conversationId?: string;
	websiteId?: string;
	connectionId?: string;
};

/**
 * Connection info stored in Redis
 */
export type ConnectionInfo = {
	connectionId: string;
	serverId: string;
	userId?: string;
	visitorId?: string;
	websiteId?: string;
	organizationId?: string;
	connectedAt: number;
	lastHeartbeat: number;
};

/**
 * Message handler type
 */
export type MessageHandler = (
	event: RealtimeEvent,
	channel: string
) => void | Promise<void>;

/**
 * Simple subscription handle
 */
export type Subscription = {
	unsubscribe: () => Promise<void>;
};

/**
 * Production-ready pub/sub service using Upstash Redis
 * Each API server instance subscribes to relevant channels and
 * broadcasts to its local WebSocket connections
 */
export class PubSubService {
	private activeSubscriptions = new Map<string, AbortController>();
	private messageHandlers = new Map<string, Set<MessageHandler>>();
	private isShuttingDown = false;
	private cleanupInterval?: NodeJS.Timeout;

	constructor() {
		// Start connection cleanup interval
		this.startConnectionCleanup();
	}

	/**
	 * Publish an event to the appropriate channels
	 */
	async publish<T extends RealtimeEventType>(
		eventType: T,
		data: RealtimeEventData<T>,
		target: PublishTarget
	): Promise<void> {
		if (this.isShuttingDown) {
			throw new Error("PubSub service is shutting down");
		}

		const event: RealtimeEvent<T> = {
			type: eventType,
			data,
			timestamp: Date.now(),
		};

		const message = JSON.stringify(event);
		const publishPromises: Promise<number>[] = [];
		const channels: string[] = [];

		// Publish to appropriate channels based on target
		if (target.conversationId) {
			const channel = getVisitorChannelName(target.conversationId);
			channels.push(channel);
			publishPromises.push(redis.publish(channel, message));
		}

		if (target.websiteId) {
			const channel = getDashboardChannelName(target.websiteId);
			channels.push(channel);
			publishPromises.push(redis.publish(channel, message));
		}

		if (target.connectionId) {
			const channel = getConnectionChannelName(target.connectionId);
			channels.push(channel);
			publishPromises.push(redis.publish(channel, message));
		}

		if (publishPromises.length === 0) {
			throw new Error("At least one target must be specified");
		}

		// Wait for all publish operations to complete
		const results = await Promise.all(publishPromises);
		const totalReceivers = results.reduce((sum, count) => sum + count, 0);

		console.log(
			`[PubSub] Published ${eventType} to ${channels.length} channels (${totalReceivers} receivers)`
		);
	}

	/**
	 * Subscribe to a channel using Upstash Redis SSE
	 */
	async subscribe(
		channel: string,
		handler: MessageHandler
	): Promise<Subscription> {
		if (this.isShuttingDown) {
			throw new Error("PubSub service is shutting down");
		}

		// Add handler to the set for this channel
		let handlers = this.messageHandlers.get(channel);

		if (!handlers) {
			handlers = new Set();
			this.messageHandlers.set(channel, handlers);
		}

		handlers.add(handler);

		// If not already subscribed to this channel, start subscription
		if (!this.activeSubscriptions.has(channel)) {
			const abortController = new AbortController();
			this.activeSubscriptions.set(channel, abortController);

			// Start the subscription in background
			this.startSubscription(channel, abortController);
			console.log(`[PubSub] Subscribed to channel: ${channel}`);
		}

		// Return unsubscribe function
		return {
			unsubscribe: async () => {
				const channelHandlers = this.messageHandlers.get(channel);
				if (channelHandlers) {
					channelHandlers.delete(handler);

					// If no more handlers for this channel, stop subscription
					if (channelHandlers.size === 0) {
						this.messageHandlers.delete(channel);
						const controller = this.activeSubscriptions.get(channel);
						if (controller) {
							controller.abort();
							this.activeSubscriptions.delete(channel);
							console.log(`[PubSub] Unsubscribed from channel: ${channel}`);
						}
					}
				}
			},
		};
	}

	/**
	 * Regex for removing trailing slashes (defined at top level for performance)
	 */
	private static readonly TRAILING_SLASH_REGEX = /\/$/;

	/**
	 * Start SSE subscription for a channel
	 */
	private async startSubscription(
		channel: string,
		abortController: AbortController
	) {
		const baseUrl = env.UPSTASH_REDIS_REST_URL.replace(
			PubSubService.TRAILING_SLASH_REGEX,
			""
		);
		const endpoint = `${baseUrl}/subscribe/${encodeURIComponent(channel)}`;

		const handleStreamResponse = async (response: Response) => {
			if (!response.body) {
				throw new Error("Response body is null");
			}
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (!abortController.signal.aborted) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						await this.processMessage(channel, data);
					}
				}
			}
		};

		const reconnect = async () => {
			if (abortController.signal.aborted || this.isShuttingDown) {
				return;
			}

			try {
				const response = await fetch(endpoint, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
						Accept: "text/event-stream",
					},
					signal: abortController.signal,
				});

				if (!(response.ok && response.body)) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				await handleStreamResponse(response);
			} catch (error) {
				if (abortController.signal.aborted) {
					return;
				}

				console.error(`[PubSub] Subscription error for ${channel}:`, error);
				// Retry after 5 seconds
				setTimeout(() => reconnect(), 5000);
			}
		};

		// Start the subscription
		reconnect();
	}

	/**
	 * Process incoming message from SSE
	 */
	private async processMessage(channel: string, data: string) {
		try {
			// Parse SSE message format
			const parts = data.split(",", 3);

			if (parts.length < 2) {
				return;
			}

			const [messageType, messageChannel] = parts;
			const message = parts.length > 2 ? parts.slice(2).join(",") : "";

			if (messageType === "message" && messageChannel === channel && message) {
				const event = JSON.parse(message) as RealtimeEvent;
				const handlers = this.messageHandlers.get(channel);

				if (handlers) {
					// Execute all handlers for this channel
					const promises = Array.from(handlers).map((handler) =>
						Promise.resolve(handler(event, channel)).catch((error) => {
							console.error("[PubSub] Handler error:", error);
						})
					);
					await Promise.all(promises);
				}
			}
		} catch (error) {
			console.error("[PubSub] Failed to process message:", error);
		}
	}

	/**
	 * Subscribe to channels based on options
	 */
	async subscribeToChannels(
		options: {
			conversationId?: string;
			websiteId?: string;
			connectionId?: string;
		},
		handler: MessageHandler
	): Promise<Subscription> {
		const unsubscribeFunctions: Array<() => Promise<void>> = [];

		if (options.conversationId) {
			const sub = await this.subscribe(
				getVisitorChannelName(options.conversationId),
				handler
			);
			unsubscribeFunctions.push(sub.unsubscribe);
		}

		if (options.websiteId) {
			const sub = await this.subscribe(
				getDashboardChannelName(options.websiteId),
				handler
			);
			unsubscribeFunctions.push(sub.unsubscribe);
		}

		if (options.connectionId) {
			const sub = await this.subscribe(
				getConnectionChannelName(options.connectionId),
				handler
			);
			unsubscribeFunctions.push(sub.unsubscribe);
		}

		// Return combined unsubscribe function
		return {
			unsubscribe: async () => {
				await Promise.all(unsubscribeFunctions.map((fn) => fn()));
			},
		};
	}

	/**
	 * Register a connection in Redis
	 */
	async registerConnection(info: ConnectionInfo): Promise<void> {
		const key = `connection:${info.connectionId}`;
		await redis.setex(key, CONNECTION_TTL_SECONDS, JSON.stringify(info));

		// Add to website's connection set if websiteId is present
		if (info.websiteId) {
			await redis.sadd(
				`website:${info.websiteId}:connections`,
				info.connectionId
			);
			// Set expiry on the set (will be refreshed on each new connection)
			await redis.expire(`website:${info.websiteId}:connections`, 3600); // 1 hour
		}

		console.log(
			`[PubSub] Registered connection: ${info.connectionId} on server: ${SERVER_ID}`
		);
	}

	/**
	 * Update connection heartbeat
	 */
	async heartbeatConnection(connectionId: string): Promise<void> {
		const key = `connection:${connectionId}`;
		const data = await redis.get<string>(key);

		if (data) {
			const info = JSON.parse(data) as ConnectionInfo;
			info.lastHeartbeat = Date.now();
			await redis.setex(key, CONNECTION_TTL_SECONDS, JSON.stringify(info));
		}
	}

	async unregisterConnection(connectionId: string): Promise<void> {
		const key = `connection:${connectionId}`;
		const data = await redis.get<string>(key);

		if (data) {
			const info = JSON.parse(data) as ConnectionInfo;

			// Remove from website's connection set
			if (info.websiteId) {
				await redis.srem(`website:${info.websiteId}:connections`, connectionId);
			}

			// Delete the connection data
			await redis.del(key);

			console.log(`[PubSub] Unregistered connection: ${connectionId}`);
		}
	}

	/**
	 * Retrieve connection info directly from Redis
	 */
	async getConnectionInfo(
		connectionId: string
	): Promise<ConnectionInfo | null> {
		const key = `connection:${connectionId}`;
		const data = await redis.get<string>(key);

		return data ? (JSON.parse(data) as ConnectionInfo) : null;
	}

	/**
	 * Get all connections for a website
	 */
	async getWebsiteConnections(websiteId: string): Promise<ConnectionInfo[]> {
		const connectionIds = await redis.smembers<string[]>(
			`website:${websiteId}:connections`
		);
		if (!connectionIds || connectionIds.length === 0) {
			return [];
		}

		const connections: ConnectionInfo[] = [];
		for (const connId of connectionIds) {
			const data = await redis.get<string>(`connection:${connId}`);
			if (data) {
				connections.push(JSON.parse(data));
			}
		}

		return connections;
	}

	/**
	 * Update user presence
	 */
	async updatePresence(
		userId: string,
		status: "online" | "away" | "offline",
		websiteId?: string
	): Promise<void> {
		const key = `presence:${userId}`;
		const presence = {
			status,
			lastSeen: Date.now(),
			websiteId,
		};

		if (status === "offline") {
			await redis.del(key);
		} else {
			// Presence expires after 5 minutes of no updates
			await redis.setex(key, 300, JSON.stringify(presence));
		}

		// Publish presence update event if we have context
		if (websiteId) {
			await this.publish(
				"USER_PRESENCE_UPDATE",
				{
					userId,
					status,
					lastSeen: presence.lastSeen,
				},
				{ websiteId }
			);
		}
	}

	/**
	 * Get user presence
	 */
	async getPresence(
		userId: string
	): Promise<{ status: string; lastSeen: number } | null> {
		const data = await redis.get<string>(`presence:${userId}`);
		return data ? JSON.parse(data) : null;
	}

	/**
	 * Clean up expired connections periodically
	 */
	private startConnectionCleanup() {
		this.cleanupInterval = setInterval(async () => {
			if (this.isShuttingDown) {
				return;
			}

			try {
				// Note: Upstash Redis automatically handles key expiration
				// This is just for logging and additional cleanup if needed
				console.log("[PubSub] Running connection cleanup check");
			} catch (error) {
				console.error("[PubSub] Connection cleanup error:", error);
			}
		}, 60_000); // Run every minute
	}

	/**
	 * Get server ID
	 */
	getServerId(): string {
		return SERVER_ID;
	}

	/**
	 * Check if a connection belongs to this server
	 */
	async isLocalConnection(connectionId: string): Promise<boolean> {
		const data = await redis.get<string>(`connection:${connectionId}`);
		if (!data) {
			return false;
		}

		const info = JSON.parse(data) as ConnectionInfo;
		return info.serverId === SERVER_ID;
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		console.log("[PubSub] Shutting down...");
		this.isShuttingDown = true;

		// Clear cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		// Abort all active subscriptions
		for (const [channel, controller] of this.activeSubscriptions) {
			controller.abort();
			console.log(`[PubSub] Aborted subscription to ${channel}`);
		}

		this.activeSubscriptions.clear();
		this.messageHandlers.clear();

		console.log("[PubSub] Shutdown complete");
	}
}

/**
 * Global pub/sub service instance
 */
export const pubsub = new PubSubService();

/**
 * Convenience functions
 */
export async function emitToVisitors<T extends RealtimeEventType>(
	conversationId: string,
	eventType: T,
	data: RealtimeEventData<T>
): Promise<void> {
	return pubsub.publish(eventType, data, { conversationId });
}

export async function emitToDashboard<T extends RealtimeEventType>(
	websiteId: string,
	eventType: T,
	data: RealtimeEventData<T>
): Promise<void> {
	return pubsub.publish(eventType, data, { websiteId });
}

export async function emitToAll<T extends RealtimeEventType>(
	conversationId: string,
	websiteId: string,
	eventType: T,
	data: RealtimeEventData<T>
): Promise<void> {
	return pubsub.publish(eventType, data, { conversationId, websiteId });
}

export async function emitToConnection<T extends RealtimeEventType>(
	connectionId: string,
	eventType: T,
	data: RealtimeEventData<T>
): Promise<void> {
	return pubsub.publish(eventType, data, { connectionId });
}

/**
 * Helper function to trigger events from anywhere in the API
 */
export async function triggerEvent<T extends RealtimeEventType>(
	eventType: T,
	data: RealtimeEventData<T>,
	target: PublishTarget
): Promise<void> {
	return pubsub.publish(eventType, data, target);
}
