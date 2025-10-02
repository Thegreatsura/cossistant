import { markConversationAsSeenByVisitor } from "@api/db/mutations/conversation";
import { getVisitor } from "@api/db/queries";
import {
	getConversationByIdWithLastMessage,
	listConversations,
	upsertConversation,
} from "@api/db/queries/conversation";
import { emitConversationSeenEvent } from "@api/utils/conversation-realtime";
import { createMessage } from "@api/utils/message";
import {
	safelyExtractRequestData,
	safelyExtractRequestQuery,
	validateResponse,
} from "@api/utils/validate";
import {
	createConversationRequestSchema,
	createConversationResponseSchema,
	getConversationRequestSchema,
	getConversationResponseSchema,
	listConversationsRequestSchema,
	listConversationsResponseSchema,
	markConversationSeenRequestSchema,
	markConversationSeenResponseSchema,
} from "@cossistant/types/api/conversation";
import type { Message } from "@cossistant/types/schemas";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { protectedPublicApiKeyMiddleware } from "../middleware";
import type { RestContext } from "../types";

export const conversationRouter = new OpenAPIHono<RestContext>();

// Apply middleware to all routes in this router
conversationRouter.use("/*", ...protectedPublicApiKeyMiddleware);

conversationRouter.openapi(
	{
		method: "post",
		path: "/",
		summary: "Create a conversation with or without initial messages",
		description:
			"Create a conversation, accepts a conversation id or not and a set of default messages.",
		tags: ["Conversations"],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: createConversationRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Conversation created",
				content: {
					"application/json": {
						schema: createConversationResponseSchema,
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
			await safelyExtractRequestData(c, createConversationRequestSchema);

		const visitor = await getVisitor(db, {
			visitorId: body.visitorId || visitorIdHeader,
			externalVisitorId: body.externalVisitorId,
		});

		if (!visitor) {
			return c.json(
				{
					error:
						"Visitor not found, please pass a valid visitorId or externalVisitorId",
				},
				400
			);
		}

		const conversation = await upsertConversation(db, {
			organizationId: organization.id,
			websiteId: website.id,
			visitorId: visitor.id,
			conversationId: body.conversationId,
		});

		let initialMessages: Message[] = [];

		const defaults = body.defaultMessages ?? [];
		if (defaults.length > 0) {
			initialMessages = await Promise.all(
				defaults.map((msg) =>
                                        createMessage({
                                                db,
                                                organizationId: organization.id,
                                                websiteId: website.id,
                                                conversationId: conversation.id,
                                                conversationOwnerVisitorId: conversation.visitorId,
                                                message: {
                                                        bodyMd: msg.bodyMd,
                                                        type: msg.type ?? undefined,
                                                        userId: msg.userId ?? null,
							aiAgentId: msg.aiAgentId ?? null,
							visitorId: msg.visitorId ?? null,
							visibility: msg.visibility ?? undefined,
							createdAt: msg.createdAt,
						},
					})
				)
			);
		}

		// Get the last message if any were sent
		const lastMessage =
			initialMessages.length > 0 ? initialMessages.at(-1) : undefined;

		return c.json(
			validateResponse(
				{
					initialMessages,
					conversation: {
						id: conversation.id,
						createdAt: conversation.createdAt,
						updatedAt: conversation.updatedAt,
						visitorId: conversation.visitorId,
						websiteId: conversation.websiteId,
						status: conversation.status,
						lastMessage,
					},
				},
				createConversationResponseSchema
			)
		);
	}
);

conversationRouter.openapi(
	{
		method: "get",
		path: "/",
		summary: "List conversations for a visitor",
		description:
			"Fetch paginated list of conversations for a specific visitor with optional filters.",
		tags: ["Conversations"],
		request: {
			query: listConversationsRequestSchema,
		},
		responses: {
			200: {
				description: "List of conversations retrieved successfully",
				content: {
					"application/json": {
						schema: listConversationsResponseSchema,
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
		const { db, website, organization, query, visitorIdHeader } =
			await safelyExtractRequestQuery(c, listConversationsRequestSchema);

		const visitor = await getVisitor(db, {
			visitorId: query.visitorId || visitorIdHeader,
			externalVisitorId: query.externalVisitorId,
		});

		if (!visitor) {
			return c.json(
				{
					error:
						"Visitor not found, please pass a valid visitorId or externalVisitorId",
				},
				400
			);
		}

		const result = await listConversations(db, {
			organizationId: organization.id,
			websiteId: website.id,
			visitorId: visitor.id,
			page: query.page,
			limit: query.limit,
			status: query.status,
			orderBy: query.orderBy,
			order: query.order,
		});

		// Transform database response to match API schema
		const apiResponse = {
			conversations: result.conversations.map((conv) => ({
				id: conv.id,
				title: conv.title ?? undefined,
				createdAt: conv.createdAt,
				updatedAt: conv.updatedAt,
				visitorId: conv.visitorId,
				websiteId: conv.websiteId,
				status: conv.status,
				lastMessage: conv.lastMessage,
			})),
			pagination: result.pagination,
		};

		return c.json(
			validateResponse(apiResponse, listConversationsResponseSchema)
		);
	}
);

conversationRouter.openapi(
	{
		method: "get",
		path: "/{conversationId}",
		summary: "Get a single conversation by ID",
		description: "Fetch a specific conversation by its ID.",
		tags: ["Conversations"],
		request: {
			params: getConversationRequestSchema,
		},
		responses: {
			200: {
				description: "Conversation retrieved successfully",
				content: {
					"application/json": {
						schema: getConversationResponseSchema,
					},
				},
			},
			404: {
				description: "Conversation not found",
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
				name: "conversationId",
				in: "path",
				description: "The ID of the conversation to retrieve",
				required: true,
				schema: {
					type: "string",
				},
			},
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
		const { db, website, organization } = await safelyExtractRequestData(c);

		// Validate path params manually for now
		const params = getConversationRequestSchema.parse({
			conversationId: c.req.param("conversationId"),
		});

		const conversation = await getConversationByIdWithLastMessage(db, {
			organizationId: organization.id,
			websiteId: website.id,
			conversationId: params.conversationId,
		});

		if (!conversation) {
			return c.json(
				{
					error: "Conversation not found",
				},
				404
			);
		}

		// Transform database response to match API schema
		const apiResponse = {
			conversation: {
				id: conversation.id,
				title: conversation.title ?? undefined,
				createdAt: conversation.createdAt,
				updatedAt: conversation.updatedAt,
				visitorId: conversation.visitorId,
				websiteId: conversation.websiteId,
				status: conversation.status,
				lastMessage: conversation.lastMessage,
			},
		};

		return c.json(validateResponse(apiResponse, getConversationResponseSchema));
	}
);

conversationRouter.openapi(
	{
		method: "post",
		path: "/{conversationId}/seen",
		summary: "Mark a conversation as seen by the visitor",
		description:
			"Record a visitor's last seen timestamp for a specific conversation.",
		tags: ["Conversations"],
		request: {
			body: {
				required: false,
				content: {
					"application/json": {
						schema: markConversationSeenRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Conversation seen timestamp recorded",
				content: {
					"application/json": {
						schema: markConversationSeenResponseSchema,
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
			404: {
				description: "Conversation not found",
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
		],
		parameters: [
			{
				name: "conversationId",
				in: "path",
				description: "The ID of the conversation to mark as seen",
				required: true,
				schema: {
					type: "string",
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
			await safelyExtractRequestData(c, markConversationSeenRequestSchema);

		const params = getConversationRequestSchema.parse({
			conversationId: c.req.param("conversationId"),
		});

		const [visitor, conversationRecord] = await Promise.all([
			getVisitor(db, {
				visitorId: body.visitorId || visitorIdHeader,
				externalVisitorId: body.externalVisitorId,
			}),
			getConversationByIdWithLastMessage(db, {
				organizationId: organization.id,
				websiteId: website.id,
				conversationId: params.conversationId,
			}),
		]);

		if (!visitor || visitor.websiteId !== website.id) {
			return c.json(
				{
					error:
						"Visitor not found, please pass a valid visitorId or externalVisitorId",
				},
				400
			);
		}

		if (!conversationRecord || conversationRecord.visitorId !== visitor.id) {
			return c.json(
				{
					error: "Conversation not found",
				},
				404
			);
		}

		const lastSeenAt = await markConversationAsSeenByVisitor(db, {
			conversation: conversationRecord,
			visitorId: visitor.id,
		});

		await emitConversationSeenEvent({
			conversation: conversationRecord,
			actor: { type: "visitor", visitorId: visitor.id },
			lastSeenAt,
		});

		const response = {
			conversationId: conversationRecord.id,
			lastSeenAt,
		};

		return c.json(
			validateResponse(response, markConversationSeenResponseSchema),
			200
		);
	}
);
