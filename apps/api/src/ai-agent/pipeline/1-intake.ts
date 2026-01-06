/**
 * Pipeline Step 1: Intake
 *
 * This step gathers all context needed for the AI agent to make decisions.
 * It validates the agent is active and loads conversation history with roles.
 *
 * Responsibilities:
 * - Validate AI agent exists and is active
 * - Load conversation with full context
 * - Build role-aware message history
 * - Load visitor information
 * - Check conversation state (assignees, escalation)
 */

import type { Database } from "@api/db";
import { getAiAgentById } from "@api/db/queries/ai-agent";
import { getConversationById } from "@api/db/queries/conversation";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import {
	buildConversationHistory,
	type RoleAwareMessage,
} from "../context/conversation";
import { type ConversationState, getConversationState } from "../context/state";
import { getVisitorContext, type VisitorContext } from "../context/visitor";
import type { AiAgentPipelineInput } from "./index";

export type IntakeResult =
	| {
			status: "ready";
			aiAgent: AiAgentSelect;
			conversation: ConversationSelect;
			conversationHistory: RoleAwareMessage[];
			visitorContext: VisitorContext | null;
			conversationState: ConversationState;
			triggerMessage: RoleAwareMessage | null;
	  }
	| {
			status: "skipped";
			reason: string;
	  };

/**
 * Gather all context needed for AI agent processing
 */
export async function intake(
	db: Database,
	input: AiAgentPipelineInput
): Promise<IntakeResult> {
	// Validate AI agent exists and is active
	const aiAgent = await getAiAgentById(db, { aiAgentId: input.aiAgentId });

	if (!aiAgent) {
		return {
			status: "skipped",
			reason: `AI agent ${input.aiAgentId} not found`,
		};
	}

	if (!aiAgent.isActive) {
		return {
			status: "skipped",
			reason: `AI agent ${input.aiAgentId} is not active`,
		};
	}

	// Load conversation
	const conversation = await getConversationById(db, {
		conversationId: input.conversationId,
	});

	if (!conversation) {
		return {
			status: "skipped",
			reason: `Conversation ${input.conversationId} not found`,
		};
	}

	// Load all context in parallel
	const [conversationHistory, visitorContext, conversationState] =
		await Promise.all([
			buildConversationHistory(db, {
				conversationId: input.conversationId,
				organizationId: input.organizationId,
				websiteId: input.websiteId,
			}),
			getVisitorContext(db, input.visitorId),
			getConversationState(db, {
				conversationId: input.conversationId,
				organizationId: input.organizationId,
			}),
		]);

	// Find the trigger message
	const triggerMessage =
		conversationHistory.find((msg) => msg.messageId === input.messageId) ??
		null;

	return {
		status: "ready",
		aiAgent,
		conversation,
		conversationHistory,
		visitorContext,
		conversationState,
		triggerMessage,
	};
}
