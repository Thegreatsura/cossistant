/**
 * Set Conversation Title Tool
 *
 * Allows the AI to set a descriptive title for the conversation.
 * Should be called early when the topic becomes clear.
 */

import { tool } from "ai";
import { z } from "zod";
import { updateTitle } from "../actions/update-title";
import type { ToolContext, ToolResult } from "./types";

const inputSchema = z.object({
	title: z
		.string()
		.max(100)
		.describe(
			"Brief, descriptive title summarizing the conversation topic (e.g., 'Password reset issue', 'Shipping delay inquiry')"
		),
});

/**
 * Create the setConversationTitle tool with bound context
 */
export function createSetConversationTitleTool(ctx: ToolContext) {
	return tool({
		description:
			"Set a brief, descriptive title for this conversation. Call this early when the main topic becomes clear. Keep titles under 60 characters.",
		inputSchema,
		execute: async ({ title }): Promise<ToolResult<{ title: string }>> => {
			try {
				await updateTitle({
					db: ctx.db,
					conversation: ctx.conversation,
					organizationId: ctx.organizationId,
					websiteId: ctx.websiteId,
					aiAgentId: ctx.aiAgentId,
					title: title.trim(),
				});

				return {
					success: true,
					data: { title: title.trim() },
				};
			} catch (error) {
				console.error(
					`[tool:setConversationTitle] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error: error instanceof Error ? error.message : "Failed to set title",
				};
			}
		},
	});
}
