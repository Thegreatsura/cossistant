import { z } from "zod";
import { visitorResponseSchema } from "../api/visitor";
import { conversationRecordSchema } from "./conversation";

export const blockVisitorResponseSchema = z.object({
	conversation: conversationRecordSchema,
	visitor: visitorResponseSchema,
});

export type BlockVisitorResponse = z.infer<typeof blockVisitorResponseSchema>;
