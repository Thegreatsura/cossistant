import { z } from "zod";
import { visitorProfileSchema } from "../api/visitor";
import {
	ConversationPriority,
	ConversationSentiment,
	ConversationStatus,
} from "../enums";
import { messageSchema } from "../schemas";

export const conversationStatusSchema = z.enum([
	ConversationStatus.OPEN,
	ConversationStatus.RESOLVED,
	ConversationStatus.SPAM,
]);

export const conversationPrioritySchema = z.enum([
	ConversationPriority.LOW,
	ConversationPriority.NORMAL,
	ConversationPriority.HIGH,
	ConversationPriority.URGENT,
]);

export const conversationSentimentSchema = z
	.enum([
		ConversationSentiment.POSITIVE,
		ConversationSentiment.NEGATIVE,
		ConversationSentiment.NEUTRAL,
	])
	.nullable();

export const conversationRecordSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	visitorId: z.string(),
	websiteId: z.string(),
	status: conversationStatusSchema,
	priority: conversationPrioritySchema,
	sentiment: conversationSentimentSchema,
	sentimentConfidence: z.number().nullable(),
	channel: z.string(),
	title: z.string().nullable(),
	resolutionTime: z.number().nullable(),
	startedAt: z.date().nullable(),
	firstResponseAt: z.date().nullable(),
	resolvedAt: z.date().nullable(),
	lastMessageAt: z.date().nullable(),
	lastMessageBy: z.string().nullable(),
	resolvedByUserId: z.string().nullable(),
	resolvedByAiAgentId: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	deletedAt: z.date().nullable(),
});

export type ConversationRecordResponse = z.infer<
	typeof conversationRecordSchema
>;

export const conversationMutationResponseSchema = z.object({
	conversation: conversationRecordSchema,
});

export const conversationHeaderSchema = z.object({
	id: z.string(),
	status: conversationStatusSchema,
	priority: conversationPrioritySchema,
	organizationId: z.string(),
	visitorId: z.string(),
	visitor: visitorProfileSchema,
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
	lastSeenAt: z.date().nullable(),
	lastMessagePreview: messageSchema.nullable(),
	viewIds: z.array(z.string()),
});

export const listConversationHeadersResponseSchema = z.object({
	items: z.array(conversationHeaderSchema),
	nextCursor: z.string().nullable(),
});

export type ConversationMutationResponse = z.infer<
	typeof conversationMutationResponseSchema
>;

export type ConversationHeader = z.infer<typeof conversationHeaderSchema>;
