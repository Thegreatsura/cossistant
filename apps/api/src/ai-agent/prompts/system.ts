/**
 * System Prompt Builder
 *
 * Builds dynamic system prompts based on context and settings.
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import type { VisitorContext } from "../context/visitor";
import { formatVisitorContextForPrompt } from "../context/visitor";
import type { ResponseMode } from "../pipeline/2-decision";
import { getBehaviorSettings } from "../settings";
import { buildBehaviorInstructions } from "./instructions";
import { PROMPT_TEMPLATES } from "./templates";

type BuildPromptInput = {
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	visitorContext: VisitorContext | null;
	mode: ResponseMode;
	humanCommand: string | null;
};

/**
 * Build the complete system prompt for the AI agent
 */
export function buildSystemPrompt(input: BuildPromptInput): string {
	const { aiAgent, visitorContext, mode, humanCommand } = input;
	const settings = getBehaviorSettings(aiAgent);

	const parts: string[] = [];

	// Base prompt from agent configuration
	parts.push(aiAgent.basePrompt);

	// Add structured output instructions
	parts.push(PROMPT_TEMPLATES.STRUCTURED_OUTPUT);

	// Add behavior instructions based on settings
	parts.push(buildBehaviorInstructions(settings, mode));

	// Add mode-specific instructions
	if (mode === "respond_to_command" && humanCommand) {
		parts.push(buildCommandModeInstructions(humanCommand));
	} else if (mode === "respond_to_visitor") {
		parts.push(PROMPT_TEMPLATES.VISITOR_RESPONSE);
	}

	// Add visitor context
	const visitorPrompt = formatVisitorContextForPrompt(visitorContext);
	if (visitorPrompt) {
		parts.push(visitorPrompt);
	}

	// Add conversation context
	parts.push(PROMPT_TEMPLATES.CONVERSATION_CONTEXT);

	return parts.join("\n\n");
}

/**
 * Build instructions for command mode
 */
function buildCommandModeInstructions(command: string): string {
	return `## Human Agent Command

A human support agent has given you a command. You should follow this instruction:

"${command}"

Important:
- This is a request from a teammate, not a visitor
- Your response should help the support team
- Use "internal_note" action unless the command specifically asks you to respond to the visitor
- Be concise and actionable`;
}
