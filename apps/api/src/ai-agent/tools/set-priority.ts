/**
 * Set Priority Tool
 *
 * Allows the AI to set conversation priority based on urgency.
 */

import { tool } from "ai";
import { z } from "zod";
import { updatePriority } from "../actions/update-priority";
import type { ToolContext, ToolResult } from "./types";

const inputSchema = z.object({
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.describe("Priority level based on urgency and impact"),
	reason: z
		.string()
		.describe(
			"Brief reason for the priority level (e.g., 'Customer reports service outage')"
		),
});

/**
 * Create the setPriority tool with bound context
 */
export function createSetPriorityTool(ctx: ToolContext) {
	return tool({
		description:
			"Set the conversation priority based on urgency. Use 'urgent' for time-sensitive issues (outages, critical bugs), 'high' for important matters, 'normal' for standard requests, 'low' for minor questions.",
		inputSchema,
		execute: async ({
			priority,
			reason,
		}): Promise<ToolResult<{ priority: string; reason: string }>> => {
			try {
				await updatePriority({
					db: ctx.db,
					conversation: ctx.conversation,
					organizationId: ctx.organizationId,
					aiAgentId: ctx.aiAgentId,
					newPriority: priority,
				});

				console.log(
					`[tool:setPriority] conv=${ctx.conversationId} | priority=${priority} | reason="${reason}"`
				);

				return {
					success: true,
					data: { priority, reason },
				};
			} catch (error) {
				console.error(
					`[tool:setPriority] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to set priority",
				};
			}
		},
	});
}
