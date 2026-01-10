/**
 * Pipeline Step 3: Generation
 *
 * This step generates the AI response using the LLM with structured output.
 * It builds the prompt dynamically based on context and behavior settings.
 *
 * Responsibilities:
 * - Build dynamic system prompt
 * - Format conversation history for LLM
 * - Call LLM with structured output schema
 * - Parse and validate AI decision
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { env } from "@api/env";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { RoleAwareMessage } from "../context/conversation";
import type { VisitorContext } from "../context/visitor";
import { type AiDecision, aiDecisionSchema } from "../output/schemas";
import { buildSystemPrompt } from "../prompts/system";
import type { ResponseMode } from "./2-decision";

export type GenerationResult = {
	decision: AiDecision;
	usage?: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
};

type GenerationInput = {
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	conversationHistory: RoleAwareMessage[];
	visitorContext: VisitorContext | null;
	mode: ResponseMode;
	humanCommand: string | null;
};

/**
 * Generate AI response using LLM with structured output
 */
export async function generate(
	input: GenerationInput
): Promise<GenerationResult> {
	const {
		aiAgent,
		conversation,
		conversationHistory,
		visitorContext,
		mode,
		humanCommand,
	} = input;
	const convId = conversation.id;

	// Build dynamic system prompt
	const systemPrompt = buildSystemPrompt({
		aiAgent,
		conversation,
		visitorContext,
		mode,
		humanCommand,
	});

	// Format conversation history for LLM
	const messages = formatMessagesForLlm(conversationHistory);

	console.log(
		`[ai-agent:generate] conv=${convId} | model=${aiAgent.model} | messages=${messages.length} | mode=${mode}`
	);
	console.log(
		`[ai-agent:generate] conv=${convId} | System prompt (${systemPrompt.length} chars): "${systemPrompt.slice(0, 200).replace(/\n/g, " ")}..."`
	);

	// Get OpenRouter client
	const openrouter = createOpenRouter({
		apiKey: env.OPENROUTER_API_KEY,
	});

	// Generate structured output using AI SDK v6 pattern
	// Using generateText + Output.object instead of deprecated generateObject
	const result = await generateText({
		model: openrouter.chat(aiAgent.model),
		output: Output.object({
			schema: aiDecisionSchema,
		}),
		system: systemPrompt,
		messages,
		temperature: aiAgent.temperature ?? 0.7,
	});

	// Extract the structured output
	const decision = result.output;

	// Validate that we got a proper decision
	if (!decision) {
		console.error(
			`[ai-agent:generate] conv=${convId} | Structured output failed | text="${result.text?.slice(0, 200)}"`
		);
		// Return a safe fallback decision
		return {
			decision: {
				action: "skip" as const,
				reasoning:
					"Failed to generate structured output from model. Raw response logged for debugging.",
				confidence: 0,
			},
			usage: result.usage
				? {
						inputTokens: result.usage.inputTokens ?? 0,
						outputTokens: result.usage.outputTokens ?? 0,
						totalTokens: result.usage.totalTokens ?? 0,
					}
				: undefined,
		};
	}

	// Extract usage data from AI SDK response
	const usage = result.usage;
	console.log(
		`[ai-agent:generate] conv=${convId} | AI decided: action=${decision.action} | reasoning="${(decision.reasoning ?? "").slice(0, 100)}${(decision.reasoning ?? "").length > 100 ? "..." : ""}"`
	);
	if (decision.action === "respond" || decision.action === "internal_note") {
		console.log(
			`[ai-agent:generate] conv=${convId} | Message (${decision.message?.length ?? 0} chars): "${(decision.message ?? "").slice(0, 100)}${(decision.message ?? "").length > 100 ? "..." : ""}"`
		);
	}
	if (usage) {
		console.log(
			`[ai-agent:generate] conv=${convId} | Tokens: input=${usage.inputTokens ?? 0} output=${usage.outputTokens ?? 0} total=${usage.totalTokens ?? 0}`
		);
	}

	return {
		decision,
		usage: usage
			? {
					inputTokens: usage.inputTokens ?? 0,
					outputTokens: usage.outputTokens ?? 0,
					totalTokens: usage.totalTokens ?? 0,
				}
			: undefined,
	};
}

/**
 * Format role-aware messages for LLM consumption
 */
function formatMessagesForLlm(
	messages: RoleAwareMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
	return messages.map((msg) => {
		// Visitor messages are "user", everything else is "assistant"
		const role = msg.senderType === "visitor" ? "user" : "assistant";

		// Add sender context to the message
		let content = msg.content;
		if (msg.senderType === "human_agent" && msg.senderName) {
			content = `[Support Agent ${msg.senderName}]: ${content}`;
		} else if (msg.senderType === "ai_agent") {
			content = `[AI Assistant]: ${content}`;
		}

		return { role, content };
	});
}
