/**
 * Title Generation
 *
 * Generates a conversation title using AI.
 * Creates a private TITLE_GENERATED event.
 */

import type { Database } from "@api/db";
import { getConversationTimelineItems } from "@api/db/queries/conversation";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { env } from "@api/env";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import { updateTitle } from "../actions/update-title";

/**
 * Model to use for title generation (fast and cheap)
 */
const TITLE_MODEL = "openai/gpt-4o-mini";

/**
 * Schema for title generation response
 */
const titleSchema = z.object({
	title: z
		.string()
		.max(100)
		.describe(
			"A brief, descriptive title for the conversation (max 100 chars)"
		),
});

type GenerateTitleParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	websiteId: string;
	aiAgentId: string;
};

/**
 * Generate and update conversation title
 *
 * Uses LLM to generate a brief, descriptive title based on the first messages.
 */
export async function generateTitle(
	params: GenerateTitleParams
): Promise<void> {
	const { db, conversation, organizationId, websiteId, aiAgentId } = params;

	// Skip if title already exists
	if (conversation.title) {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Title already exists, skipping`
		);
		return;
	}

	// Get first few messages for title generation
	const { items } = await getConversationTimelineItems(db, {
		organizationId,
		conversationId: conversation.id,
		websiteId,
		limit: 5, // Only need first few messages
		visibility: [TimelineItemVisibility.PUBLIC],
	});

	// Filter to only message items with content
	const messages = items.filter(
		(item) =>
			item.type === ConversationTimelineType.MESSAGE &&
			item.text &&
			item.text.trim()
	);

	if (messages.length === 0) {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | No messages for title generation`
		);
		return;
	}

	// Get the first visitor message if available, otherwise first message
	const visitorMessages = messages.filter((m) => m.visitorId);
	const firstMessage = visitorMessages[0] || messages[0];

	if (!firstMessage?.text) {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | No message content for title`
		);
		return;
	}

	try {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Generating title from ${messages.length} messages`
		);

		const openrouter = createOpenRouter({
			apiKey: env.OPENROUTER_API_KEY,
		});

		// Format messages for context
		const messageContext = messages
			.slice(0, 3) // Use first 3 messages max
			.map((m) => {
				const sender = m.visitorId ? "Visitor" : "Agent";
				return `${sender}: "${m.text}"`;
			})
			.join("\n");

		const result = await generateText({
			model: openrouter.chat(TITLE_MODEL),
			output: Output.object({
				schema: titleSchema,
			}),
			system: `You are a title generator for customer support conversations. Create brief, descriptive titles that summarize the main topic or issue.

Guidelines:
- Keep titles concise (under 60 characters ideally, max 100)
- Focus on the main topic or issue
- Use neutral, professional language
- Don't include names or personal information
- Start with the subject/topic, not "Question about..." or "Help with..."

Examples of good titles:
- "Shipping delay for order #12345"
- "Password reset not working"
- "Refund request for damaged product"
- "API integration question"`,
			prompt: `Generate a brief title for this support conversation:

${messageContext}`,
			temperature: 0.3, // Low temperature for consistent titles
		});

		if (!result.output) {
			console.error(
				`[ai-agent:analysis] conv=${conversation.id} | Title generation returned no structured output`
			);
			return;
		}

		const generatedTitle = result.output.title.trim();

		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Generated title: "${generatedTitle}"`
		);

		// Update conversation with title
		await updateTitle({
			db,
			conversation,
			organizationId,
			websiteId,
			aiAgentId,
			title: generatedTitle,
		});
	} catch (error) {
		// Log but don't throw - title generation is non-critical
		console.error(
			`[ai-agent:analysis] conv=${conversation.id} | Title generation failed:`,
			error instanceof Error ? error.message : error
		);
	}
}
