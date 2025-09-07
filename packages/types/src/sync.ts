import { z } from "zod";
import { ConversationPriority, ConversationStatus } from "./enums";

export const syncConversationSchema = z.object({
	id: z.string(),
	status: z.nativeEnum(ConversationStatus),
	priority: z.nativeEnum(ConversationPriority),
	organizationId: z.string(),
	visitorId: z.string(),
	websiteId: z.string(),
	channel: z.string(),
	title: z.string().nullable(),
	resolutionTime: z.number().nullable(),
	startedAt: z.date().nullable(),
	firstResponseAt: z.date().nullable(),
	resolvedAt: z.date().nullable(),
	resolvedByUserId: z.string().nullable(),
	resolvedByAiAgentId: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	deletedAt: z.date().nullable(),
	lastMessageAt: z.date().nullable(),
});

export const syncResponseSchema = z.object({
	conversations: z.array(syncConversationSchema),
	cursor: z.string().datetime().nullable(),
	hasMore: z.boolean(),
});

export const syncRequestSchema = z.object({
	websiteId: z.string().ulid(),
	cursor: z.string().datetime().nullable().optional(),
	limit: z.number().int().min(1).max(100).default(50),
});

export type SyncConversation = z.infer<typeof syncConversationSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;