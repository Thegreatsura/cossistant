/**
 * Update Sentiment Tool
 *
 * Allows the AI to update conversation sentiment when the visitor's tone changes.
 * Should be called when noticing emotional shifts in the conversation.
 */

import { tool } from "ai";
import { z } from "zod";
import { updateSentiment as updateSentimentAction } from "../actions/update-sentiment";
import type { ToolContext, ToolResult } from "./types";

const inputSchema = z.object({
	sentiment: z
		.enum(["positive", "neutral", "negative"])
		.describe("The current emotional tone of the visitor"),
	reason: z
		.string()
		.describe(
			"Brief reason for the sentiment assessment (e.g., 'Visitor expressed frustration about wait time')"
		),
});

/**
 * Create the updateSentiment tool with bound context
 */
export function createUpdateSentimentTool(ctx: ToolContext) {
	return tool({
		description:
			"Update the conversation sentiment when you notice the visitor's tone changing. Call this when detecting frustration, satisfaction, or other emotional shifts.",
		inputSchema,
		execute: async ({
			sentiment,
			reason,
		}): Promise<ToolResult<{ sentiment: string; reason: string }>> => {
			try {
				await updateSentimentAction({
					db: ctx.db,
					conversation: ctx.conversation,
					organizationId: ctx.organizationId,
					websiteId: ctx.websiteId,
					aiAgentId: ctx.aiAgentId,
					sentiment,
					confidence: 0.9, // High confidence since AI is making this call in context
				});

				console.log(
					`[tool:updateSentiment] conv=${ctx.conversationId} | sentiment=${sentiment} | reason="${reason}"`
				);

				return {
					success: true,
					data: { sentiment, reason },
				};
			} catch (error) {
				console.error(
					`[tool:updateSentiment] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to update sentiment",
				};
			}
		},
	});
}
