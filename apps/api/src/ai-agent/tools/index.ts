/**
 * Tools Module
 *
 * Defines LLM tools that the AI agent can use during generation.
 * These tools allow the AI to gather additional context.
 *
 * NOTE: Tools are currently disabled pending integration with the RAG system.
 * The structured output schema is used instead for decision-making.
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";

/**
 * Get tools for the generation step
 *
 * Currently returns undefined as tools are handled via structured output schema.
 * Knowledge retrieval should be integrated into the intake step.
 */
export function getToolsForGeneration(_aiAgent: AiAgentSelect): undefined {
	// Tools are currently disabled - using structured output schema instead
	// Knowledge search should be integrated into the intake step
	return;
}
