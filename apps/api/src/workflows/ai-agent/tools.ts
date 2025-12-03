import { type ToolSet, tool } from "ai";
import { z } from "zod";

/**
 * AI Agent Tools
 *
 * These tools allow the AI agent to gather additional context
 * and perform actions during conversation.
 */

// Tool input schemas
const searchKnowledgeBaseSchema = z.object({
	query: z.string().describe("The search query to find relevant information"),
});

const getVisitorContextSchema = z.object({
	includeAttributes: z
		.boolean()
		.optional()
		.describe("Whether to include custom visitor attributes"),
});

const escalateToHumanSchema = z.object({
	reason: z
		.string()
		.describe("Brief reason for escalation to help the human agent"),
});

/**
 * Tool to search knowledge base for relevant information
 * Currently returns a placeholder - can be extended to integrate
 * with actual documentation/knowledge systems
 */
const searchKnowledgeBase = tool({
	description:
		"Search the knowledge base for relevant information to help answer the user's question. Use this when you need to look up documentation, FAQs, or product information.",
	inputSchema: searchKnowledgeBaseSchema,
	execute: async ({ query }) => {
		// TODO: Integrate with actual knowledge base/vector search
		// This is a placeholder that returns no results
		console.log(`[AI Agent] Knowledge base search: ${query}`);
		return {
			results: [] as string[],
			message: "Knowledge base search is not yet configured for this website.",
		};
	},
});

/**
 * Tool to get visitor information and context
 * Useful for personalizing responses based on visitor data
 */
const getVisitorContext = tool({
	description:
		"Get information about the current visitor including their name, email, and any custom attributes. Use this to personalize your response.",
	inputSchema: getVisitorContextSchema,
	execute: async ({ includeAttributes }) => {
		// This will be populated with actual visitor data in the workflow
		// The tool context is set when creating the tool set
		console.log(
			`[AI Agent] Getting visitor context (includeAttributes: ${includeAttributes})`
		);
		return {
			message:
				"Visitor context is available through conversation history. Check the system message for visitor details.",
		};
	},
});

/**
 * Tool to escalate conversation to a human agent
 */
const escalateToHuman = tool({
	description:
		"Escalate this conversation to a human support agent. Use this when you cannot adequately help the user, when they explicitly request a human, or when the issue is complex and requires human judgment.",
	inputSchema: escalateToHumanSchema,
	execute: async ({ reason }) => {
		// TODO: Implement actual escalation logic (assign to team, notify, etc.)
		console.log(`[AI Agent] Escalation requested: ${reason}`);
		return {
			escalated: true,
			message: "I've escalated this conversation to a human agent.",
			reason,
		};
	},
});

/**
 * Create the default tool set for AI agents
 * Tools can be customized per website/agent via metadata
 */
export function createAIAgentTools(): ToolSet {
	return {
		searchKnowledgeBase,
		getVisitorContext,
		escalateToHuman,
	};
}

/**
 * Get tools based on AI agent metadata configuration
 * Allows per-agent customization of available tools
 */
export function getToolsForAgent(
	agentMetadata: Record<string, unknown> | null
): ToolSet | undefined {
	// Check if tools are disabled for this agent
	if (agentMetadata?.disableTools === true) {
		return;
	}

	// Get default tools
	const tools = createAIAgentTools();

	// Filter tools based on agent configuration
	const enabledTools = agentMetadata?.enabledTools as string[] | undefined;
	if (enabledTools && Array.isArray(enabledTools)) {
		const filteredTools: ToolSet = {};
		for (const toolName of enabledTools) {
			if (toolName in tools) {
				filteredTools[toolName] = tools[toolName];
			}
		}
		return Object.keys(filteredTools).length > 0 ? filteredTools : undefined;
	}

	return tools;
}
