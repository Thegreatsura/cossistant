/**
 * Update Conversation Title Tool
 *
 * Allows the AI to set or update a descriptive title for the conversation.
 * Can be called when the topic becomes clear, or updated later if a more
 * accurate title is discovered during the conversation.
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
 * Create the updateConversationTitle tool with bound context
 */
export function createUpdateConversationTitleTool(ctx: ToolContext) {
	return tool({
		description:
			"Set or update the title for this conversation. Use this when the main topic becomes clear, or update it later if you discover a more accurate description. Keep titles under 60 characters.",
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
					`[tool:updateConversationTitle] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to update title",
				};
			}
		},
	});
}
