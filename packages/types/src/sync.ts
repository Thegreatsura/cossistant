import { z } from "zod";
import {
  ConversationPriority,
  ConversationStatus,
  MessageType,
  MessageVisibility,
} from "./enums";

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

export const syncMessageSchema = z.object({
  id: z.string(),
  bodyMd: z.string(),
  type: z.nativeEnum(MessageType),
  userId: z.string().nullable(),
  visitorId: z.string().nullable(),
  organizationId: z.string(),
  websiteId: z.string(),
  conversationId: z.string(),
  parentMessageId: z.string().nullable(),
  aiAgentId: z.string().nullable(),
  modelUsed: z.string().nullable(),
  visibility: z.nativeEnum(MessageVisibility),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const syncConversationsResponseSchema = z.object({
  conversations: z.array(syncConversationSchema),
  cursor: z.string().datetime().nullable(),
  hasMore: z.boolean(),
});

export const syncMessagesResponseSchema = z.object({
  messages: z.array(syncMessageSchema),
  cursor: z.string().datetime().nullable(),
  hasMore: z.boolean(),
});

export const syncResponseSchema = z.object({
  conversations: z.array(syncConversationSchema),
  messages: z.array(syncMessageSchema),
  cursor: z.string().datetime().nullable(),
  hasMore: z.boolean(),
  nextPage: z.number().int().nullable(),
});

export const syncRequestSchema = z.object({
  websiteId: z.string().ulid(),
  cursor: z.string().datetime().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type SyncConversation = z.infer<typeof syncConversationSchema>;
export type SyncMessage = z.infer<typeof syncMessageSchema>;
export type SyncConversationsResponse = z.infer<
  typeof syncConversationsResponseSchema
>;
export type SyncMessagesResponse = z.infer<typeof syncMessagesResponseSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
