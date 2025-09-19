import {
	getConversationById,
	getConversationEvents,
	listConversationsHeaders,
} from "@api/db/queries/conversation";
import { getConversationMessages } from "@api/db/queries/message";
import { getVisitorComplete } from "@api/db/queries/visitor";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import { createMessage } from "@api/utils/message";
import {
	conversationEventSchema,
	MessageType,
	MessageVisibility,
	messageSchema,
	visitorProfileSchema,
	visitorResponseSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const conversationRouter = createTRPCRouter({
	listConversationsHeaders: protectedProcedure
		.input(
			z.object({
				websiteSlug: z.string(),
				limit: z.number().int().min(1).max(500).optional(),
				cursor: z.string().nullable().optional(),
			})
		)
		.output(
			z.object({
				items: z.array(
					z.object({
						id: z.string(),
						status: z.string(),
						priority: z.string(),
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
						lastMessagePreview: messageSchema.nullable(),
						viewIds: z.array(z.string()),
					})
				),
				nextCursor: z.string().nullable(),
			})
		)
		.query(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			// Fetch conversations for the website
			const result = await listConversationsHeaders(db, {
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				limit: input.limit,
				cursor: input.cursor,
			});

			return {
				items: result.items,
				nextCursor: result.nextCursor,
			};
		}),

	getConversationMessages: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				websiteSlug: z.string(),
				limit: z.number().int().min(1).max(100).optional().default(50),
				cursor: z.date().nullable().optional(),
			})
		)
		.output(
			z.object({
				items: z.array(messageSchema),
				nextCursor: z.date().nullable(),
				hasNextPage: z.boolean(),
			})
		)
		.query(async ({ ctx: { db, user }, input }) => {
			// Query website access and conversation in parallel
			const [websiteData, conversation] = await Promise.all([
				getWebsiteBySlugWithAccess(db, {
					userId: user.id,
					websiteSlug: input.websiteSlug,
				}),
				getConversationById(db, {
					conversationId: input.conversationId,
				}),
			]);

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			if (!conversation || conversation.websiteId !== websiteData.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			// Get messages
			const result = await getConversationMessages(db, {
				conversationId: input.conversationId,
				websiteId: websiteData.id,
				limit: input.limit,
				cursor: input.cursor,
			});

			return {
				items: result.messages,
				nextCursor: result.nextCursor,
				hasNextPage: result.hasNextPage,
			};
		}),

	getConversationEvents: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				websiteSlug: z.string(),
				limit: z.number().int().min(1).max(100).optional().default(50),
				cursor: z.date().nullable().optional(),
			})
		)
		.output(
			z.object({
				items: z.array(conversationEventSchema),
				nextCursor: z.date().nullable(),
				hasNextPage: z.boolean(),
			})
		)
		.query(async ({ ctx: { db, user }, input }) => {
			// Query website access and conversation in parallel
			const [websiteData, conversation] = await Promise.all([
				getWebsiteBySlugWithAccess(db, {
					userId: user.id,
					websiteSlug: input.websiteSlug,
				}),
				getConversationById(db, {
					conversationId: input.conversationId,
				}),
			]);

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			if (!conversation || conversation.websiteId !== websiteData.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			// Get events
			const result = await getConversationEvents(db, {
				conversationId: input.conversationId,
				websiteId: websiteData.id,
				limit: input.limit,
				cursor: input.cursor,
			});

			return {
				items: result.events.map((event) => ({
					...event,
					metadata: event.metadata as Record<string, unknown>,
					updatedAt: event.createdAt,
					deletedAt: null,
					message: event.message ?? undefined,
				})),
				nextCursor: result.nextCursor,
				hasNextPage: result.hasNextPage,
			};
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				websiteSlug: z.string(),
				bodyMd: z.string().min(1),
				type: z
					.enum([MessageType.TEXT, MessageType.IMAGE, MessageType.FILE])
					.default(MessageType.TEXT),
				visibility: z
					.enum([MessageVisibility.PUBLIC, MessageVisibility.PRIVATE])
					.default(MessageVisibility.PUBLIC),
			})
		)
		.output(z.object({ message: messageSchema }))
		.mutation(async ({ ctx: { db, user }, input }) => {
			const [websiteData, conversation] = await Promise.all([
				getWebsiteBySlugWithAccess(db, {
					userId: user.id,
					websiteSlug: input.websiteSlug,
				}),
				getConversationById(db, {
					conversationId: input.conversationId,
				}),
			]);

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			if (!conversation || conversation.websiteId !== websiteData.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Conversation not found",
				});
			}

			const createdMessage = await createMessage({
				db,
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
				conversationId: input.conversationId,
				conversationVisitorId: conversation.visitorId,
				message: {
					bodyMd: input.bodyMd,
					type: input.type,
					visibility: input.visibility,
					userId: user.id,
					visitorId: null,
					aiAgentId: null,
				},
			});

			return { message: createdMessage };
		}),

	getVisitorById: protectedProcedure
		.input(
			z.object({
				visitorId: z.string(),
				websiteSlug: z.string(),
			})
		)
		.output(visitorResponseSchema.nullable())
		.query(async ({ ctx: { db, user }, input }) => {
			// Query website access and visitor in parallel
			const [websiteData, visitor] = await Promise.all([
				getWebsiteBySlugWithAccess(db, {
					userId: user.id,
					websiteSlug: input.websiteSlug,
				}),
				getVisitorComplete(db, {
					visitorId: input.visitorId,
				}),
			]);

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			if (!visitor || visitor.websiteId !== websiteData.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Visitor not found",
				});
			}

			// Transform dates to strings for the response schema
			const { image, ...visitorWithoutImage } = visitor;
			return {
				...visitorWithoutImage,
				avatar: visitor.image,
				metadata: visitor.metadata as Record<
					string,
					string | number | boolean | null
				> | null,
				createdAt: visitor.createdAt,
				updatedAt: visitor.updatedAt,
				lastSeenAt: visitor.lastSeenAt ?? null,
			};
		}),
});
