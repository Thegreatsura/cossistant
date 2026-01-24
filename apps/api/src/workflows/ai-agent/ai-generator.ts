import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import {
	createModel,
	generateText,
	type ModelMessage,
	type ToolSet,
} from "@api/lib/ai";

export type GenerateAIResponseOptions = {
	aiAgent: AiAgentSelect;
	conversationHistory: ModelMessage[];
	tools?: ToolSet;
};

export type GenerateAIResponseResult = {
	text: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
};

/**
 * Generate an AI response using OpenRouter and the AI SDK v5
 * This function handles the actual AI generation with the configured model
 */
export async function generateAIResponse(
	options: GenerateAIResponseOptions
): Promise<GenerateAIResponseResult> {
	const { aiAgent, conversationHistory, tools } = options;

	const result = await generateText({
		model: createModel(aiAgent.model),
		system: aiAgent.basePrompt,
		messages: conversationHistory,
		tools,
		temperature: aiAgent.temperature ?? 0.7,
		maxOutputTokens: aiAgent.maxOutputTokens ?? 1024,
	});

	// Extract usage data if available (format varies by provider)
	const usage = result.usage as unknown as
		| { promptTokens?: number; completionTokens?: number; totalTokens?: number }
		| undefined;

	return {
		text: result.text,
		usage:
			usage?.promptTokens !== undefined &&
			usage?.completionTokens !== undefined &&
			usage?.totalTokens !== undefined
				? {
						promptTokens: usage.promptTokens,
						completionTokens: usage.completionTokens,
						totalTokens: usage.totalTokens,
					}
				: undefined,
	};
}
