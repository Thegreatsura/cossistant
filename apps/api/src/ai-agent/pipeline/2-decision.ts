/**
 * Pipeline Step 2: Decision
 *
 * This step determines if and how the AI agent should respond.
 *
 * IMPORTANT: Smart decision is OBLIGATORY for all messages.
 * The ONLY exceptions are:
 * 1. @ai or /ai command (explicit AI request - always respond)
 * 2. AI is paused (never respond)
 *
 * For ALL other messages, the AI must evaluate whether to respond.
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import type { RoleAwareMessage } from "../context/conversation";
import type { ConversationState } from "../context/state";
import {
	runSmartDecision,
	type SmartDecisionResult,
} from "./2a-smart-decision";

export type ResponseMode =
	| "respond_to_visitor"
	| "respond_to_command"
	| "background_only";

export type DecisionResult = {
	shouldAct: boolean;
	reason: string;
	mode: ResponseMode;
	humanCommand: string | null;
	/** Whether conversation is currently escalated (human requested) */
	isEscalated: boolean;
	/** Reason for escalation if escalated */
	escalationReason: string | null;
	/** Smart decision details if AI was used */
	smartDecision?: SmartDecisionResult;
};

type DecisionInput = {
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	conversationHistory: RoleAwareMessage[];
	conversationState: ConversationState;
	triggerMessage: RoleAwareMessage | null;
};

/**
 * Determine if and how the AI agent should act
 *
 * Smart decision is ALWAYS run except for:
 * - @ai or /ai commands (always respond)
 * - AI is paused (never respond)
 */
export async function decide(input: DecisionInput): Promise<DecisionResult> {
	const { triggerMessage, conversationState } = input;
	const convId = input.conversation.id;

	// No trigger message - don't act
	if (!triggerMessage) {
		console.log(
			`[ai-agent:decision] conv=${convId} | No trigger message, skipping`
		);
		return {
			shouldAct: false,
			reason: "No trigger message",
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// ==========================================================================
	// EXCEPTION 1: @ai or /ai command - ALWAYS respond (skip smart decision)
	// ==========================================================================
	const aiCommand = detectAiCommand(triggerMessage);
	if (aiCommand) {
		console.log(
			`[ai-agent:decision] conv=${convId} | @ai command detected, responding`
		);
		return {
			shouldAct: true,
			reason: "AI was explicitly tagged",
			mode: "respond_to_command",
			humanCommand: aiCommand,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// ==========================================================================
	// EXCEPTION 2: AI is paused - NEVER respond (skip smart decision)
	// ==========================================================================
	if (isAiPaused(input.conversation)) {
		console.log(`[ai-agent:decision] conv=${convId} | AI is paused, skipping`);
		return {
			shouldAct: false,
			reason: "AI is paused for this conversation",
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// ==========================================================================
	// ALL OTHER MESSAGES: Smart decision is OBLIGATORY
	// ==========================================================================
	console.log(
		`[ai-agent:decision] conv=${convId} | Running smart decision for ${triggerMessage.senderType} message`
	);

	const smartResult = await runSmartDecision({
		aiAgent: input.aiAgent,
		conversation: input.conversation,
		conversationHistory: input.conversationHistory,
		conversationState,
		triggerMessage,
	});

	// Map smart decision intent to response
	const responseMode =
		triggerMessage.senderType === "human_agent"
			? "respond_to_command"
			: "respond_to_visitor";

	if (smartResult.intent === "observe") {
		console.log(
			`[ai-agent:decision] conv=${convId} | Smart decision: observe | "${smartResult.reasoning}"`
		);
		return {
			shouldAct: false,
			reason: `Smart decision: ${smartResult.reasoning}`,
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
			smartDecision: smartResult,
		};
	}

	if (smartResult.intent === "assist_team") {
		console.log(
			`[ai-agent:decision] conv=${convId} | Smart decision: assist_team | "${smartResult.reasoning}"`
		);
		return {
			shouldAct: true,
			reason: `Smart decision: ${smartResult.reasoning}`,
			mode: "background_only", // Will only send private messages
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
			smartDecision: smartResult,
		};
	}

	// intent === "respond"
	console.log(
		`[ai-agent:decision] conv=${convId} | Smart decision: respond | "${smartResult.reasoning}"`
	);
	return {
		shouldAct: true,
		reason: `Smart decision: ${smartResult.reasoning}`,
		mode: responseMode,
		humanCommand:
			triggerMessage.senderType === "human_agent"
				? triggerMessage.content
				: null,
		isEscalated: conversationState.isEscalated,
		escalationReason: conversationState.escalationReason,
		smartDecision: smartResult,
	};
}

/**
 * Detect if the message contains @ai or /ai command
 * Can be from visitor OR human agent
 */
function detectAiCommand(message: RoleAwareMessage): string | null {
	const text = message.content.trim();
	const lowerText = text.toLowerCase();

	// Check for @ai prefix (from anyone)
	if (lowerText.startsWith("@ai ") || lowerText === "@ai") {
		return text.slice(3).trim() || text;
	}

	// Check for /ai prefix (from anyone)
	if (lowerText.startsWith("/ai ") || lowerText === "/ai") {
		return text.slice(3).trim() || text;
	}

	return null;
}

/**
 * Check if AI is paused for this conversation
 */
function isAiPaused(conversation: ConversationSelect): boolean {
	if (!conversation.aiPausedUntil) {
		return false;
	}

	return new Date(conversation.aiPausedUntil) > new Date();
}
