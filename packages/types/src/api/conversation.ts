import { z } from "@hono/zod-openapi";
import { conversationSchema } from "../schemas";
import { timelineItemSchema } from "./timeline-item";

export const createConversationRequestSchema = z
	.object({
		visitorId: z.string().optional().openapi({
			description:
				"Visitor ID, if not provided you must provide a visitorId in the headers.",
		}),
		conversationId: z.string().optional().openapi({
			description:
				"Default conversation ID, if not provided the ID will be automatically generated.",
		}),
		defaultTimelineItems: z.array(timelineItemSchema).openapi({
			description: "Default timeline items to initiate the conversation with",
		}),
		channel: z.string().default("widget").openapi({
			description: "Which channel the conversation is from",
			default: "widget",
		}),
	})
	.openapi({
		description: "Body for creating a conversation.",
	});

export type CreateConversationRequestBody = z.infer<
	typeof createConversationRequestSchema
>;

export const createConversationResponseSchema = z
	.object({
		initialTimelineItems: z.array(timelineItemSchema),
		conversation: conversationSchema,
	})
	.openapi({
		description: "Body including created conversation and default messages",
	});

export type CreateConversationResponseBody = z.infer<
	typeof createConversationResponseSchema
>;

export const listConversationsRequestSchema = z
	.object({
		visitorId: z.string().optional().openapi({
			description: "Visitor ID to fetch conversations for.",
		}),
		page: z.coerce.number().min(1).default(1).openapi({
			description: "Page number for pagination",
			default: 1,
		}),
		limit: z.coerce.number().min(1).max(100).default(6).openapi({
			description: "Number of conversations per page",
			default: 6,
		}),
		status: z.enum(["open", "closed"]).optional().openapi({
			description: "Filter by conversation status",
		}),
		orderBy: z.enum(["createdAt", "updatedAt"]).default("updatedAt").openapi({
			description: "Field to order conversations by",
			default: "updatedAt",
		}),
		order: z.enum(["asc", "desc"]).default("desc").openapi({
			description: "Order direction",
			default: "desc",
		}),
	})
	.openapi({
		description: "Query parameters for listing conversations",
	});

export type ListConversationsRequest = z.infer<
	typeof listConversationsRequestSchema
>;

export const listConversationsResponseSchema = z
	.object({
		conversations: z.array(
			conversationSchema.extend({
				visitorLastSeenAt: z.string().nullable().openapi({
					description:
						"Timestamp when the visitor last saw this conversation, or null if never seen",
				}),
			})
		),
		pagination: z.object({
			page: z.number(),
			limit: z.number(),
			total: z.number(),
			totalPages: z.number(),
			hasMore: z.boolean(),
		}),
	})
	.openapi({
		description: "Paginated list of conversations",
	});

export type ListConversationsResponse = z.infer<
	typeof listConversationsResponseSchema
>;

export const getConversationRequestSchema = z
	.object({
		conversationId: z.string().openapi({
			description: "The ID of the conversation to retrieve",
		}),
	})
	.openapi({
		description: "Parameters for retrieving a single conversation",
	});

export type GetConversationRequest = z.infer<
	typeof getConversationRequestSchema
>;

export const getConversationResponseSchema = z
	.object({
		conversation: conversationSchema,
	})
	.openapi({
		description: "Response containing a single conversation",
	});

export type GetConversationResponse = z.infer<
	typeof getConversationResponseSchema
>;

export const markConversationSeenRequestSchema = z
	.object({
		visitorId: z.string().optional().openapi({
			description:
				"Visitor ID associated with the conversation. Optional if provided via the X-Visitor-Id header.",
		}),
	})
	.openapi({
		description:
			"Body for marking a conversation as seen. Either visitorId must be provided via body or headers.",
	});

export type MarkConversationSeenRequestBody = z.infer<
	typeof markConversationSeenRequestSchema
>;

export const markConversationSeenResponseSchema = z
	.object({
		conversationId: z.string().openapi({
			description: "The ID of the conversation that was marked as seen",
		}),
		lastSeenAt: z.string().openapi({
			description:
				"Timestamp indicating when the visitor last saw the conversation",
		}),
	})
	.openapi({
		description: "Response confirming the conversation has been marked as seen",
	});

export type MarkConversationSeenResponseBody = z.infer<
	typeof markConversationSeenResponseSchema
>;

export const setConversationTypingRequestSchema = z
	.object({
		isTyping: z.boolean().openapi({
			description: "Whether the visitor is currently typing",
		}),
		visitorPreview: z.string().max(2000).optional().openapi({
			description:
				"Optional preview of the visitor's message while typing. Only processed when the visitor is typing.",
		}),
		visitorId: z.string().optional().openapi({
			description:
				"Visitor ID associated with the conversation. Optional if provided via the X-Visitor-Id header.",
		}),
	})
	.openapi({
		description:
			"Body for reporting a visitor typing state. Either visitorId must be provided via body or headers.",
	});

export type SetConversationTypingRequestBody = z.infer<
	typeof setConversationTypingRequestSchema
>;

export const setConversationTypingResponseSchema = z
	.object({
		conversationId: z.string().openapi({
			description: "The ID of the conversation receiving the typing update",
		}),
		isTyping: z.boolean().openapi({
			description: "Echo of the reported typing state",
		}),
		visitorPreview: z.string().nullable().openapi({
			description:
				"Preview text that was forwarded with the typing event, or null when none was sent.",
		}),
		sentAt: z.string().openapi({
			description: "Timestamp when the typing event was recorded",
		}),
	})
	.openapi({
		description: "Response confirming the visitor typing state was recorded",
	});

export type SetConversationTypingResponseBody = z.infer<
	typeof setConversationTypingResponseSchema
>;

export const getConversationSeenDataResponseSchema = z
	.object({
		seenData: z.array(
			z.object({
				id: z.string().openapi({
					description: "The seen record's unique identifier",
				}),
				conversationId: z.string().openapi({
					description: "The conversation ID",
				}),
				userId: z.string().nullable().openapi({
					description: "The user ID who saw the conversation, if applicable",
				}),
				visitorId: z.string().nullable().openapi({
					description: "The visitor ID who saw the conversation, if applicable",
				}),
				aiAgentId: z.string().nullable().openapi({
					description:
						"The AI agent ID who saw the conversation, if applicable",
				}),
				lastSeenAt: z.string().openapi({
					description: "Timestamp when the conversation was last seen",
				}),
				createdAt: z.string().openapi({
					description: "When the seen record was created",
				}),
				updatedAt: z.string().openapi({
					description: "When the seen record was last updated",
				}),
				deletedAt: z.string().nullable().openapi({
					description: "When the seen record was deleted, if applicable",
				}),
			})
		),
	})
	.openapi({
		description: "Response containing seen data for a conversation",
	});

export type GetConversationSeenDataResponse = z.infer<
	typeof getConversationSeenDataResponseSchema
>;
