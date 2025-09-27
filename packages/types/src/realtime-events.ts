import { z } from "zod";
import { MessageType, MessageVisibility } from "./enums";

/**
 * Central event system for real-time communication
 * All WebSocket and Redis Pub/Sub events are defined here
 */
export const RealtimeEvents = {
	USER_CONNECTED: z.object({
		userId: z.string(),
		connectionId: z.string(),
		timestamp: z.number(),
	}),
	USER_DISCONNECTED: z.object({
		userId: z.string(),
		connectionId: z.string(),
		timestamp: z.number(),
	}),
	VISITOR_CONNECTED: z.object({
		visitorId: z.string(),
		connectionId: z.string(),
		timestamp: z.number(),
	}),
	VISITOR_DISCONNECTED: z.object({
		visitorId: z.string(),
		connectionId: z.string(),
		timestamp: z.number(),
	}),
	USER_PRESENCE_UPDATE: z.object({
		userId: z.string(),
		status: z.enum(["online", "away", "offline"]),
		lastSeen: z.number(),
	}),
	CONVERSATION_SEEN: z.object({
		conversationId: z.string(),
		websiteId: z.string(),
		organizationId: z.string(),
		visitorId: z.string().nullable(),
		userId: z.string().nullable(),
		aiAgentId: z.string().nullable(),
		lastSeenAt: z.string(),
	}),
	CONVERSATION_TYPING: z.object({
		conversationId: z.string(),
		websiteId: z.string(),
		organizationId: z.string(),
		visitorId: z.string().nullable(),
		userId: z.string().nullable(),
		aiAgentId: z.string().nullable(),
		isTyping: z.boolean(),
	}),
	CONVERSATION_EVENT_CREATED: z.object({
		conversationId: z.string(),
		websiteId: z.string(),
		organizationId: z.string(),
		visitorId: z.string().nullable(),
		userId: z.string().nullable(),
		aiAgentId: z.string().nullable(),
		event: z.object({
			id: z.string(),
			conversationId: z.string(),
			organizationId: z.string(),
			type: z.string(),
			actorUserId: z.string().nullable(),
			actorAiAgentId: z.string().nullable(),
		}),
	}),
	MESSAGE_CREATED: z.object({
		message: z.object({
			id: z.string(),
			bodyMd: z.string(),
			type: z.string(),
			userId: z.string().nullable(),
			visitorId: z.string().nullable(),
			organizationId: z.string(),
			websiteId: z.string(),
			conversationId: z.string(),
			parentMessageId: z.string().nullable(),
			aiAgentId: z.string().nullable(),
			modelUsed: z.string().nullable(),
			visibility: z.string(),
			createdAt: z.string(),
			updatedAt: z.string(),
			deletedAt: z.string().nullable(),
		}),
		conversationId: z.string(),
		websiteId: z.string(),
		organizationId: z.string(),
	}),
} as const;

export type RealtimeEventType = keyof typeof RealtimeEvents;

export type RealtimeEvent<T extends RealtimeEventType = RealtimeEventType> = {
	type: T;
	data: z.infer<(typeof RealtimeEvents)[T]>;
	timestamp: number;
};

export type RealtimeEventData<T extends RealtimeEventType> = z.infer<
	(typeof RealtimeEvents)[T]
>;

/**
 * Validates an event against its schema
 */
export function validateRealtimeEvent<T extends RealtimeEventType>(
	type: T,
	data: unknown
): RealtimeEventData<T> {
	const schema = RealtimeEvents[type];
	return schema.parse(data) as RealtimeEventData<T>;
}

/**
 * Type guard to check if a string is a valid event type
 */
export function isValidEventType(type: unknown): type is RealtimeEventType {
	return typeof type === "string" && type in RealtimeEvents;
}
