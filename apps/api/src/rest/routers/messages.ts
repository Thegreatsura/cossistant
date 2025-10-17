import { markConversationAsSeenByVisitor } from "@api/db/mutations/conversation";
import { getConversationById } from "@api/db/queries/conversation";
import { markVisitorPresence } from "@api/services/presence";
import { emitConversationSeenEvent } from "@api/utils/conversation-realtime";
import { createTimelineItem } from "@api/utils/timeline-item";
import {
	safelyExtractRequestData,
	validateResponse,
} from "@api/utils/validate";
import {
	sendMessageRequestSchema,
	sendMessageResponseSchema,
} from "@cossistant/types/api/message";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { protectedPublicApiKeyMiddleware } from "../middleware";
import type { RestContext } from "../types";

export const messagesRouter = new OpenAPIHono<RestContext>();

// Apply middleware to all routes in this router
messagesRouter.use("/*", ...protectedPublicApiKeyMiddleware);

// GET /messages endpoint removed - use /conversations/:id/timeline instead

messagesRouter.openapi(
	{
		method: "post",
		path: "/",
		summary: "Send a message to a conversation",
		description: "Send a new message to an existing conversation.",
		tags: ["Messages"],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: sendMessageRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Message sent successfully",
				content: {
					"application/json": {
						schema: sendMessageResponseSchema,
					},
				},
			},
			400: {
				description: "Invalid request",
				content: {
					"application/json": {
						schema: z.object({ error: z.string() }),
					},
				},
			},
		},
		security: [
			{
				"Public API Key": [],
			},
			{
				"Private API Key": [],
			},
		],
		parameters: [
			{
				name: "Authorization",
				in: "header",
				description:
					"Private API key in Bearer token format. Use this for server-to-server authentication. Format: `Bearer sk_[live|test]_...`",
				required: false,
				schema: {
					type: "string",
					pattern: "^Bearer sk_(live|test)_[a-f0-9]{64}$",
					example:
						"Bearer sk_test_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
				},
			},
			{
				name: "X-Public-Key",
				in: "header",
				description:
					"Public API key for browser-based authentication. Can only be used from whitelisted domains. Format: `pk_[live|test]_...`",
				required: false,
				schema: {
					type: "string",
					pattern: "^pk_(live|test)_[a-f0-9]{64}$",
					example:
						"pk_test_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
				},
			},
			{
				name: "X-Visitor-Id",
				in: "header",
				description: "Visitor ID from localStorage.",
				required: false,
				schema: {
					type: "string",
					pattern: "^[0-9A-HJKMNP-TV-Z]{26}$",
					example: "01JG000000000000000000000",
				},
			},
		],
	},
	async (c) => {
		const { db, website, organization, body, visitorIdHeader } =
			await safelyExtractRequestData(c, sendMessageRequestSchema);

		const visitorId = body.message.visitorId || visitorIdHeader || null;

		if (!visitorId) {
			return c.json(
				validateResponse(
					{ error: "Visitor ID is required" },
					z.object({ error: z.string() })
				)
			);
		}

		const createdTimelineItem = await createTimelineItem({
			db,
			organizationId: organization.id,
			websiteId: website.id,
			conversationId: body.conversationId,
			conversationOwnerVisitorId: visitorId,
			item: {
				type: "message",
				text: body.message.bodyMd,
				parts: [{ type: "text", text: body.message.bodyMd }],
				visibility: body.message.visibility,
				userId: body.message.userId ?? null,
				aiAgentId: body.message.aiAgentId ?? null,
				visitorId,
				createdAt: body.message.createdAt
					? new Date(body.message.createdAt)
					: undefined,
			},
		});

		// Mark conversation as seen by visitor after sending message
		const conversation = await getConversationById(db, {
			conversationId: body.conversationId,
		});

		if (conversation && conversation.websiteId === website.id) {
			const lastSeenAt = await markConversationAsSeenByVisitor(db, {
				conversation,
				visitorId,
			});

			await emitConversationSeenEvent({
				conversation,
				actor: { type: "visitor", visitorId },
				lastSeenAt,
			});

			await markVisitorPresence({
				websiteId: website.id,
				visitorId,
				lastSeenAt: lastSeenAt ?? new Date().toISOString(),
			});
		}

		// Convert timeline item to message format for response
		const sentMessage = {
			id: createdTimelineItem.id,
			bodyMd: createdTimelineItem.text || "",
			type: body.message.type ?? "text",
			userId: createdTimelineItem.userId,
			visitorId: createdTimelineItem.visitorId,
			aiAgentId: createdTimelineItem.aiAgentId,
			conversationId: createdTimelineItem.conversationId,
			organizationId: createdTimelineItem.organizationId,
			websiteId: website.id,
			parentMessageId: null,
			modelUsed: null,
			visibility: createdTimelineItem.visibility,
			createdAt: createdTimelineItem.createdAt,
			updatedAt: createdTimelineItem.createdAt,
			deletedAt: createdTimelineItem.deletedAt,
		};

		return c.json(
			validateResponse({ message: sentMessage }, sendMessageResponseSchema)
		);
	}
);
