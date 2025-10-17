import {
  getConversationById,
  getConversationEvents,
} from "@api/db/queries/conversation";
import {
  safelyExtractRequestQuery,
  validateResponse,
} from "@api/utils/validate";
import {
  type GetConversationEventsResponse,
  getConversationEventsRequestSchema,
  getConversationEventsResponseSchema,
} from "@cossistant/types/api/conversation-event";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { protectedPublicApiKeyMiddleware } from "../middleware";
import type { RestContext } from "../types";

export const conversationEventsRouter = new OpenAPIHono<RestContext>();

conversationEventsRouter.use("/*", ...protectedPublicApiKeyMiddleware);

conversationEventsRouter.openapi(
  {
    method: "get",
    path: "/",
    summary: "List timeline events for a conversation",
    description:
      "Fetch paginated conversation events in chronological order for a visitor conversation.",
    tags: ["Conversation Events"],
    request: {
      query: getConversationEventsRequestSchema,
    },
    responses: {
      200: {
        description: "Conversation events retrieved successfully",
        content: {
          "application/json": {
            schema: getConversationEventsResponseSchema,
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
      {
        "Private API Key": [],
      },
    ],
    parameters: [
      {
        name: "Authorization",
        in: "header",
        description:
          "Private API key in Bearer token format. Use this for server-to-server authentication.",
        required: false,
        schema: {
          type: "string",
          pattern: "^Bearer sk_(live|test)_[a-f0-9]{64}$",
        },
      },
      {
        name: "X-Public-Key",
        in: "header",
        description:
          "Public API key for browser authentication. Format: `pk_[live|test]_...`",
        required: false,
        schema: {
          type: "string",
          pattern: "^pk_(live|test)_[a-f0-9]{64}$",
        },
      },
      {
        name: "X-Visitor-Id",
        in: "header",
        description: "Visitor ID from storage, used to scope access.",
        required: false,
        schema: {
          type: "string",
          pattern: "^[0-9A-HJKMNP-TV-Z]{26}$",
        },
      },
    ],
  },
  async (c) => {
    const { db, website, organization, query, apiKey, visitorIdHeader } =
      await safelyExtractRequestQuery(c, getConversationEventsRequestSchema);

    const conversationRecord = await getConversationById(db, {
      conversationId: query.conversationId,
    });

    if (
      !conversationRecord ||
      conversationRecord.websiteId !== website.id ||
      conversationRecord.organizationId !== organization.id
    ) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    // Enforce per‑visitor access for public API keys
    if (
      apiKey.keyType === "public" &&
      (!visitorIdHeader || conversationRecord.visitorId !== visitorIdHeader)
    ) {
      return c.json({ error: "Access denied" }, 403);
    }

    const result = await getConversationEvents(db, {
      conversationId: query.conversationId,
      websiteId: website.id,
      limit: query.limit,
      cursor: query.cursor,
    });

    const response: GetConversationEventsResponse = {
      events: result.events.map((event) => {
        const createdAt = event.createdAt;

        return {
          id: event.id,
          organizationId: event.organizationId,
          conversationId: event.conversationId,
          type: event.type,
          actorUserId: event.actorUserId,
          actorAiAgentId: event.actorAiAgentId,
          targetUserId: event.targetUserId,
          targetAiAgentId: event.targetAiAgentId,
          message: event.message ?? null,
          metadata: (event.metadata as Record<string, unknown> | null) ?? null,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
        };
      }),
      hasNextPage: result.hasNextPage,
      ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
    };

    return c.json(
      validateResponse(response, getConversationEventsResponseSchema)
    );
  }
);
