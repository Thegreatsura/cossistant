import { z } from "@hono/zod-openapi";
import { MessageType, MessageVisibility } from "../enums";

export const createMessageSchema = z.object({
	id: z.string().optional(),
	bodyMd: z.string(),
	type: z
		.enum([MessageType.TEXT, MessageType.IMAGE, MessageType.FILE])
		.default(MessageType.TEXT),
	userId: z.string().nullable(),
	aiAgentId: z.string().nullable(),
	visitorId: z.string().nullable(),
	conversationId: z.string(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime().optional(),
	deletedAt: z.iso.datetime().nullable().optional(),
	visibility: z
		.enum([MessageVisibility.PUBLIC, MessageVisibility.PRIVATE])
		.optional()
		.default("public"),
});

export type CreateMessageSchema = z.infer<typeof createMessageSchema>;
