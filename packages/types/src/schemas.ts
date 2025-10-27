import { z } from "zod";
import { timelineItemSchema } from "./api/timeline-item";
import { ConversationEventType, ConversationStatus } from "./enums";

export const viewSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	prompt: z.string().nullable(),
	organizationId: z.string(),
	websiteId: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	deletedAt: z.string().nullable(),
});

export type InboxView = z.infer<typeof viewSchema>;

export const conversationSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	visitorId: z.string(),
	websiteId: z.string(),
	status: z
		.enum([
			ConversationStatus.OPEN,
			ConversationStatus.RESOLVED,
			ConversationStatus.SPAM,
		])
		.default(ConversationStatus.OPEN),
	deletedAt: z.string().nullable().default(null),
	lastTimelineItem: timelineItemSchema.optional(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationSeenSchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	userId: z.string().nullable(),
	visitorId: z.string().nullable(),
	aiAgentId: z.string().nullable(),
	lastSeenAt: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	deletedAt: z.string().nullable(),
});

export type ConversationSeen = z.infer<typeof conversationSeenSchema>;
