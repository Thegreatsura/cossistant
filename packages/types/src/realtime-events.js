import { z } from "zod";
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
};
/**
 * Validates an event against its schema
 */
export function validateRealtimeEvent(type, data) {
	const schema = RealtimeEvents[type];
	return schema.parse(data);
}
/**
 * Type guard to check if a string is a valid event type
 */
export function isValidEventType(type) {
	return typeof type === "string" && type in RealtimeEvents;
}
