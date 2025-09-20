import { z } from "zod";
/**
 * Central event system for real-time communication
 * All WebSocket and Redis Pub/Sub events are defined here
 */
export declare const RealtimeEvents: {
	readonly USER_CONNECTED: z.ZodObject<
		{
			userId: z.ZodString;
			connectionId: z.ZodString;
			timestamp: z.ZodNumber;
		},
		z.core.$strip
	>;
	readonly USER_DISCONNECTED: z.ZodObject<
		{
			userId: z.ZodString;
			connectionId: z.ZodString;
			timestamp: z.ZodNumber;
		},
		z.core.$strip
	>;
	readonly VISITOR_CONNECTED: z.ZodObject<
		{
			visitorId: z.ZodString;
			connectionId: z.ZodString;
			timestamp: z.ZodNumber;
		},
		z.core.$strip
	>;
	readonly VISITOR_DISCONNECTED: z.ZodObject<
		{
			visitorId: z.ZodString;
			connectionId: z.ZodString;
			timestamp: z.ZodNumber;
		},
		z.core.$strip
	>;
	readonly USER_PRESENCE_UPDATE: z.ZodObject<
		{
			userId: z.ZodString;
			status: z.ZodEnum<{
				online: "online";
				away: "away";
				offline: "offline";
			}>;
			lastSeen: z.ZodNumber;
		},
		z.core.$strip
	>;
	readonly MESSAGE_CREATED: z.ZodObject<
		{
			message: z.ZodObject<
				{
					id: z.ZodString;
					bodyMd: z.ZodString;
					type: z.ZodString;
					userId: z.ZodNullable<z.ZodString>;
					visitorId: z.ZodNullable<z.ZodString>;
					organizationId: z.ZodString;
					websiteId: z.ZodString;
					conversationId: z.ZodString;
					parentMessageId: z.ZodNullable<z.ZodString>;
					aiAgentId: z.ZodNullable<z.ZodString>;
					modelUsed: z.ZodNullable<z.ZodString>;
					visibility: z.ZodString;
					createdAt: z.ZodString;
					updatedAt: z.ZodString;
					deletedAt: z.ZodNullable<z.ZodString>;
				},
				z.core.$strip
			>;
			conversationId: z.ZodString;
			websiteId: z.ZodString;
			organizationId: z.ZodString;
		},
		z.core.$strip
	>;
};
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
export declare function validateRealtimeEvent<T extends RealtimeEventType>(
	type: T,
	data: unknown
): RealtimeEventData<T>;
/**
 * Type guard to check if a string is a valid event type
 */
export declare function isValidEventType(
	type: unknown
): type is RealtimeEventType;
//# sourceMappingURL=realtime-events.d.ts.map
