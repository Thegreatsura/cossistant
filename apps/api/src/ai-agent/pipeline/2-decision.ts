/**
 * Pipeline Step 2: Decision
 *
 * This step determines if and how the AI agent should respond.
 * Simplified for MVP - AI responds to all messages unless paused.
 *
 * Decision factors:
 * - Human commands (@ai prefix) - highest priority
 * - Team member messages - always respond
 * - Visitor messages - always respond
 * - Pause state - only blocker
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import type { RoleAwareMessage } from "../context/conversation";
import type { ConversationState } from "../context/state";

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
 */
export async function decide(input: DecisionInput): Promise<DecisionResult> {
	const { triggerMessage, conversationState } = input;
	const convId = input.conversation.id;

	// Check for human command first (highest priority)
	const humanCommand = detectHumanCommand(triggerMessage);

	if (humanCommand) {
		console.log(
			`[ai-agent:decision] conv=${convId} | Human command detected: "${humanCommand.slice(0, 50)}${humanCommand.length > 50 ? "..." : ""}"`
		);
		return {
			shouldAct: true,
			reason: "Human agent issued a command",
			mode: "respond_to_command",
			humanCommand,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// Check if AI is paused for this conversation
	if (isAiPaused(input.conversation)) {
		return {
			shouldAct: false,
			reason: "AI is paused for this conversation",
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// NOTE: We no longer block AI when escalated
	// The AI should continue helping while visitor waits for human
	// Escalation status is passed to generation via isEscalated field
	// The prompt will inform AI not to re-escalate

	// Team member messages are treated as implicit commands
	// (they're working in the conversation, AI should help)
	if (triggerMessage?.senderType === "human_agent") {
		console.log(
			`[ai-agent:decision] conv=${convId} | Team member message, responding`
		);
		return {
			shouldAct: true,
			reason: "Team member sent a message",
			mode: "respond_to_command",
			humanCommand: triggerMessage.content,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// Visitor messages - always respond
	if (triggerMessage?.senderType === "visitor") {
		console.log(
			`[ai-agent:decision] conv=${convId} | Visitor message, responding`
		);
		return {
			shouldAct: true,
			reason: "Visitor sent a message",
			mode: "respond_to_visitor",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// No trigger message - don't act
	console.log(
		`[ai-agent:decision] conv=${convId} | No actionable trigger, skipping`
	);
	return {
		shouldAct: false,
		reason: "No actionable trigger message",
		mode: "background_only",
		humanCommand: null,
		isEscalated: conversationState.isEscalated,
		escalationReason: conversationState.escalationReason,
	};
}

/**
 * Detect if the message is a human command to the AI
 * Commands start with @ai or /ai
 */
function detectHumanCommand(message: RoleAwareMessage | null): string | null {
	if (!message) {
		return null;
	}

	// Only human agents can issue commands
	if (message.senderType !== "human_agent") {
		return null;
	}

	const text = message.content.trim();
	const lowerText = text.toLowerCase();

	// Check for @ai prefix
	if (lowerText.startsWith("@ai ")) {
		return text.slice(4).trim();
	}

	// Check for /ai prefix
	if (lowerText.startsWith("/ai ")) {
		return text.slice(4).trim();
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
