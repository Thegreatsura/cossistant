/**
 * Sentiment Analysis
 *
 * Analyzes conversation sentiment using AI.
 * Creates a private AI_ANALYZED event.
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
import { updateSentiment } from "../actions/update-sentiment";

/**
 * Model to use for sentiment analysis (fast and cheap)
 */
const SENTIMENT_MODEL = "openai/gpt-4o-mini";

/**
 * Schema for sentiment analysis response
 */
const sentimentSchema = z.object({
	sentiment: z
		.enum(["positive", "neutral", "negative"])
		.describe("The overall sentiment of the conversation"),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("Confidence level in the sentiment analysis (0 to 1)"),
	reasoning: z
		.string()
		.describe("Brief explanation for the sentiment classification"),
});

type AnalyzeSentimentParams = {
	db: Database;
	conversation: ConversationSelect;
	organizationId: string;
	websiteId: string;
	aiAgentId: string;
};

/**
 * Analyze and update conversation sentiment
 *
 * Uses LLM to analyze the sentiment of visitor messages in the conversation.
 */
export async function analyzeSentiment(
	params: AnalyzeSentimentParams
): Promise<void> {
	const { db, conversation, organizationId, websiteId, aiAgentId } = params;

	// Skip if sentiment already analyzed recently
	if (conversation.sentiment && conversation.sentimentConfidence) {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Sentiment already analyzed, skipping`
		);
		return;
	}

	// Get recent messages for analysis
	const { items } = await getConversationTimelineItems(db, {
		organizationId,
		conversationId: conversation.id,
		websiteId,
		limit: 10, // Only need recent messages for sentiment
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
			`[ai-agent:analysis] conv=${conversation.id} | No messages to analyze`
		);
		return;
	}

	// Format messages for analysis (focus on visitor messages)
	const visitorMessages = messages
		.filter((m) => m.visitorId)
		.map((m) => m.text)
		.filter((text): text is string => !!text);

	if (visitorMessages.length === 0) {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | No visitor messages to analyze`
		);
		return;
	}

	try {
		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Analyzing sentiment of ${visitorMessages.length} visitor messages`
		);

		const openrouter = createOpenRouter({
			apiKey: env.OPENROUTER_API_KEY,
		});

		const result = await generateText({
			model: openrouter.chat(SENTIMENT_MODEL),
			output: Output.object({
				schema: sentimentSchema,
			}),
			system: `You are a sentiment analysis expert. Analyze the sentiment of the visitor's messages in a customer support conversation.

Focus on:
- The visitor's emotional tone and language
- Signs of frustration, satisfaction, or neutrality
- Urgency and emotional intensity

Return a sentiment classification (positive, neutral, negative) with a confidence score.`,
			prompt: `Analyze the sentiment of these visitor messages:

${visitorMessages.map((m, i) => `Message ${i + 1}: "${m}"`).join("\n\n")}

Consider the overall tone across all messages.`,
			temperature: 0.3, // Low temperature for consistent analysis
		});

		const analysis = result.output;

		if (!analysis) {
			console.error(
				`[ai-agent:analysis] conv=${conversation.id} | Sentiment analysis returned no structured output`
			);
			return;
		}

		console.log(
			`[ai-agent:analysis] conv=${conversation.id} | Sentiment: ${analysis.sentiment} (${Math.round(analysis.confidence * 100)}% confidence)`
		);

		// Update conversation with sentiment
		await updateSentiment({
			db,
			conversation,
			organizationId,
			aiAgentId,
			sentiment: analysis.sentiment,
			confidence: analysis.confidence,
		});
	} catch (error) {
		// Log but don't throw - sentiment analysis is non-critical
		console.error(
			`[ai-agent:analysis] conv=${conversation.id} | Sentiment analysis failed:`,
			error instanceof Error ? error.message : error
		);
	}
}
