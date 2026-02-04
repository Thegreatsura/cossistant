/**
 * Send Message Tool
 *
 * Sends a public message to the visitor.
 * Includes natural delays between messages to simulate human typing.
 */

import { tool } from "ai";
import { z } from "zod";
import { sendMessage as sendMessageAction } from "../actions/send-message";
import {
	hasNewerVisitorMessageSinceStart,
	isDuplicatePublicAiMessage,
} from "../utils/message-guards";
import type { ToolContext, ToolResult } from "./types";

/**
 * Calculate a natural typing delay based on message length.
 * Simulates human typing speed (~50-60 WPM).
 */
function calculateTypingDelay(messageLength: number): number {
	const MIN_DELAY_MS = 800; // Minimum pause between messages
	const MAX_DELAY_MS = 2500; // Maximum pause (don't make user wait too long)
	const CHARS_PER_SECOND = 25; // ~50 WPM, adjusted for natural reading pauses

	// Base delay on message length
	const typingTimeMs = (messageLength / CHARS_PER_SECOND) * 1000;

	// Clamp between min and max
	return Math.max(MIN_DELAY_MS, Math.min(typingTimeMs, MAX_DELAY_MS));
}

/**
 * Sleep for a given duration, but can be interrupted by checking workflow state.
 * Returns early if workflow is no longer active.
 */
async function interruptibleSleep(
	durationMs: number,
	checkActive?: () => Promise<boolean>
): Promise<boolean> {
	const POLL_INTERVAL_MS = 200; // Check every 200ms if we should abort
	let elapsed = 0;

	while (elapsed < durationMs) {
		const sleepTime = Math.min(POLL_INTERVAL_MS, durationMs - elapsed);
		await new Promise((resolve) => setTimeout(resolve, sleepTime));
		elapsed += sleepTime;

		// Check if workflow is still active
		if (checkActive) {
			const isActive = await checkActive();
			if (!isActive) {
				return false; // Workflow superseded, abort sleep
			}
		}
	}
	return true; // Completed full sleep
}

const inputSchema = z.object({
	message: z
		.string()
		.describe(
			"The message text to send to the visitor. Keep each message to 1-2 sentences for readability."
		),
});

/**
 * Create the sendMessage tool
 *
 * Uses counters from ToolContext instead of module-level state to ensure
 * proper isolation in worker/serverless environments.
 */
export function createSendMessageTool(ctx: ToolContext) {
	return tool({
		description:
			"REQUIRED: Send a visible message to the visitor. The visitor ONLY sees messages sent through this tool. Call this BEFORE any action tool (respond, escalate, resolve). You can call multiple times for multi-part responses.",
		inputSchema,
		execute: async ({
			message,
		}): Promise<ToolResult<{ sent: boolean; messageId: string }>> => {
			try {
				if (!ctx.allowPublicMessages) {
					console.warn(
						`[tool:sendMessage] conv=${ctx.conversationId} | Public messages not allowed for this workflow`
					);
					return {
						success: false,
						error: "Public messages are not allowed for this workflow",
						data: { sent: false, messageId: "" },
					};
				}

				// Defensive initialization for counters (handles hot reload edge cases)
				const counters = ctx.counters ?? {
					sendMessage: 0,
					sendPrivateMessage: 0,
				};
				if (!ctx.counters) {
					ctx.counters = counters;
				}

				// Increment counter in context (shared mutable object)
				counters.sendMessage++;
				const messageNumber = counters.sendMessage;
				const workflowKey = ctx.workflowRunId ?? ctx.triggerMessageId;
				const uniqueKey = `${workflowKey}-msg-${messageNumber}`;

				// CHECK: Is this workflow still active? Prevents duplicate messages
				// when a newer message has superseded this workflow during generation.
				if (ctx.checkWorkflowActive) {
					const isActive = await ctx.checkWorkflowActive();
					if (!isActive) {
						console.log(
							`[tool:sendMessage] conv=${ctx.conversationId} | Workflow superseded, skipping message #${messageNumber}`
						);
						return {
							success: false,
							error: "Workflow superseded by newer message",
							data: { sent: false, messageId: "" },
						};
					}
				}

				// CHECK: Has a newer visitor message arrived since this pipeline started?
				const { hasNewer: hasNewerVisitorMessage } =
					await hasNewerVisitorMessageSinceStart({
						db: ctx.db,
						conversationId: ctx.conversationId,
						organizationId: ctx.organizationId,
						latestVisitorMessageIdAtStart: ctx.latestVisitorMessageIdAtStart,
					});

				if (hasNewerVisitorMessage) {
					console.log(
						`[tool:sendMessage] conv=${ctx.conversationId} | Newer visitor message detected, skipping message #${messageNumber}`
					);
					if (ctx.stopTyping) {
						await ctx.stopTyping();
					}
					return {
						success: false,
						error: "Superseded by newer visitor message",
						data: { sent: false, messageId: "" },
					};
				}

				// CHECK: Prevent duplicate consecutive AI messages
				const { duplicate: isDuplicate } = await isDuplicatePublicAiMessage({
					db: ctx.db,
					conversationId: ctx.conversationId,
					organizationId: ctx.organizationId,
					messageText: message,
				});

				if (isDuplicate) {
					console.log(
						`[tool:sendMessage] conv=${ctx.conversationId} | Duplicate message detected, skipping message #${messageNumber}`
					);
					if (ctx.stopTyping) {
						await ctx.stopTyping();
					}
					return {
						success: false,
						error: "Duplicate message suppressed",
						data: { sent: false, messageId: "" },
					};
				}

				// For subsequent messages (not the first one), add a natural delay
				// with typing indicator to simulate human conversation pacing
				if (messageNumber > 1) {
					const delayMs = calculateTypingDelay(message.length);
					console.log(
						`[tool:sendMessage] conv=${ctx.conversationId} | Message #${messageNumber}: Starting typing indicator for ${delayMs}ms delay`
					);

					// Start typing indicator BEFORE the delay so users see "AI is typing..."
					// This is critical - without this, users see dead silence between messages
					if (ctx.startTyping) {
						await ctx.startTyping();
					}

					// Use interruptible sleep to abort if workflow is superseded
					const completed = await interruptibleSleep(
						delayMs,
						ctx.checkWorkflowActive
					);
					if (!completed) {
						console.log(
							`[tool:sendMessage] conv=${ctx.conversationId} | Workflow superseded during delay, skipping message #${messageNumber}`
						);
						// Stop typing since we're not sending the message
						if (ctx.stopTyping) {
							await ctx.stopTyping();
						}
						return {
							success: false,
							error: "Workflow superseded during typing delay",
							data: { sent: false, messageId: "" },
						};
					}
				}

				// Stop typing indicator just before sending the message
				// This prevents typing from showing alongside the message
				if (ctx.stopTyping) {
					console.log(
						`[tool:sendMessage] conv=${ctx.conversationId} | Stopping typing before message #${messageNumber}`
					);
					await ctx.stopTyping();
				}

				console.log(
					`[tool:sendMessage] conv=${ctx.conversationId} | sending #${messageNumber}`
				);

				const result = await sendMessageAction({
					db: ctx.db,
					conversationId: ctx.conversationId,
					organizationId: ctx.organizationId,
					websiteId: ctx.websiteId,
					visitorId: ctx.visitorId,
					aiAgentId: ctx.aiAgentId,
					text: message,
					idempotencyKey: uniqueKey,
				});

				console.log(
					`[tool:sendMessage] conv=${ctx.conversationId} | sent=${result.created}`
				);

				// Restart typing indicator after sending the message
				// This ensures typing shows while AI prepares the next message or calls other tools
				// The pipeline will stop typing at the end when generation completes
				if (ctx.startTyping) {
					console.log(
						`[tool:sendMessage] conv=${ctx.conversationId} | Restarting typing after message #${messageNumber}`
					);
					await ctx.startTyping();
				}

				return {
					success: true,
					data: { sent: result.created, messageId: result.messageId },
				};
			} catch (error) {
				console.error(
					`[tool:sendMessage] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to send message",
				};
			}
		},
	});
}
