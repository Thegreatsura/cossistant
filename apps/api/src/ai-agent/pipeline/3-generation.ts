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
import { generateObject } from "ai";
import type { RoleAwareMessage } from "../context/conversation";
import type { VisitorContext } from "../context/visitor";
import { type AiDecision, aiDecisionSchema } from "../output/schemas";
import { buildSystemPrompt } from "../prompts/system";
import type { ResponseMode } from "./2-decision";

export type GenerationResult = {
	decision: AiDecision;
	usage?: {
		promptTokens: number;
		completionTokens: number;
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

	// Generate structured output
	const result = await generateObject({
		model: openrouter.chat(aiAgent.model),
		schema: aiDecisionSchema,
		system: systemPrompt,
		messages,
		temperature: aiAgent.temperature ?? 0.7,
	});

	// Extract usage data from Vercel AI SDK format
	// Cast to expected shape - AI SDK types may vary by provider
	const usage = result.usage as
		| { promptTokens?: number; completionTokens?: number; totalTokens?: number }
		| undefined;

	const decision = result.object;
	console.log(
		`[ai-agent:generate] conv=${convId} | AI decided: action=${decision.action} | reasoning="${(decision.reasoning ?? "").slice(0, 100)}${(decision.reasoning ?? "").length > 100 ? "..." : ""}"`
	);
	if (usage) {
		console.log(
			`[ai-agent:generate] conv=${convId} | Tokens: prompt=${usage.promptTokens ?? 0} completion=${usage.completionTokens ?? 0} total=${usage.totalTokens ?? 0}`
		);
	}

	return {
		decision,
		usage: usage
			? {
					promptTokens: usage.promptTokens ?? 0,
					completionTokens: usage.completionTokens ?? 0,
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
