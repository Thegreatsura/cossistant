/**
 * Pipeline Step 2a: Smart Decision
 *
 * Uses AI to intelligently decide whether the AI agent should respond
 * to a message or let humans handle it.
 *
 * This replaces the simple rule-based decision for ambiguous cases
 * (visitor messages without explicit @ai triggers).
 *
 * Design principles:
 * - Token-efficient: minimal prompt, fast model
 * - Human-like: AI observes when humans are actively chatting
 * - Balanced: responds when helpful, stays silent when not needed
 * - Smart context: selects relevant messages, not just last N
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { createModelRaw, generateText, Output } from "@api/lib/ai";
import { z } from "zod";
import type { RoleAwareMessage } from "../context/conversation";
import type { ConversationState } from "../context/state";

/**
 * What the AI decides to do
 */
export type DecisionIntent = "respond" | "observe" | "assist_team";

/**
 * Confidence in the decision
 */
export type DecisionConfidence = "high" | "medium" | "low";

/**
 * Result from the smart decision AI
 */
export type SmartDecisionResult = {
	intent: DecisionIntent;
	reasoning: string;
	confidence: DecisionConfidence;
};

type SmartDecisionInput = {
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	conversationHistory: RoleAwareMessage[];
	conversationState: ConversationState;
	triggerMessage: RoleAwareMessage;
};

/**
 * Schema for the structured decision output
 */
const decisionSchema = z.object({
	intent: z
		.enum(["respond", "observe", "assist_team"])
		.describe(
			"respond = reply to visitor, observe = stay silent, assist_team = internal note only"
		),
	reasoning: z.string().describe("Brief explanation (1 sentence)"),
	confidence: z
		.enum(["high", "medium", "low"])
		.describe("How confident are you in this decision?"),
});

/**
 * Select relevant messages for context (token-light)
 *
 * Strategy:
 * 1. Include recent consecutive messages from current speaker burst
 * 2. Include the last exchange between different parties
 * 3. Include up to 3 recent human agent messages
 * 4. Cap at ~8 messages to stay token-efficient
 */
function selectRelevantMessages(
	history: RoleAwareMessage[],
	triggerMessage: RoleAwareMessage
): RoleAwareMessage[] {
	if (history.length === 0) {
		return [];
	}

	const MAX_MESSAGES = 8;
	const MAX_HUMAN_MESSAGES = 3;
	const result: RoleAwareMessage[] = [];
	const seen = new Set<string>();

	const addMessage = (msg: RoleAwareMessage) => {
		const key = `${msg.messageId}-${msg.content.slice(0, 50)}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(msg);
		}
	};

	// Current burst (same sender at end)
	const currentBurst: RoleAwareMessage[] = [];
	for (let i = history.length - 1; i >= 0; i--) {
		const msg = history[i];
		if (msg.senderType === triggerMessage.senderType) {
			currentBurst.unshift(msg);
		} else {
			break;
		}
	}

	const exchangeStartIndex = history.length - currentBurst.length;

	// Previous exchange context (up to 4 sender switches)
	const contextMessages: RoleAwareMessage[] = [];
	let lastSenderType: string | null = null;
	let exchangeCount = 0;
	for (let i = exchangeStartIndex - 1; i >= 0 && exchangeCount < 4; i--) {
		const msg = history[i];
		contextMessages.unshift(msg);
		if (msg.senderType !== lastSenderType) {
			exchangeCount++;
			lastSenderType = msg.senderType;
		}
	}

	// Recent human agent messages (last N)
	const humanAgentMessages: RoleAwareMessage[] = [];
	for (let i = history.length - 1; i >= 0; i--) {
		const msg = history[i];
		if (msg.senderType === "human_agent") {
			humanAgentMessages.unshift(msg);
			if (humanAgentMessages.length >= MAX_HUMAN_MESSAGES) {
				break;
			}
		}
	}

	for (const msg of humanAgentMessages) {
		addMessage(msg);
	}
	for (const msg of contextMessages) {
		addMessage(msg);
	}
	for (const msg of currentBurst) {
		addMessage(msg);
	}

	return result
		.sort((a, b) => {
			const aIndex = history.findIndex((m) => m.messageId === a.messageId);
			const bIndex = history.findIndex((m) => m.messageId === b.messageId);
			return aIndex - bIndex;
		})
		.slice(-MAX_MESSAGES);
}

/**
 * Format a message for the prompt
 */
function formatMessage(msg: RoleAwareMessage): string {
	const privatePrefix = msg.visibility === "private" ? "[PRIVATE] " : "";
	const prefix =
		msg.senderType === "visitor"
			? "[VISITOR]"
			: msg.senderType === "human_agent"
				? `[TEAM:${msg.senderName || "Agent"}]`
				: "[AI]";
	return `${privatePrefix}${prefix} ${msg.content}`;
}

/**
 * Build the prompt for the decision AI
 */
function buildDecisionPrompt(input: SmartDecisionInput): string {
	const { conversationHistory, triggerMessage, conversationState } = input;

	// Select relevant messages (smart selection, not just last N)
	const relevantMessages = selectRelevantMessages(
		conversationHistory,
		triggerMessage
	);

	// Format messages
	const formattedMessages = relevantMessages.map(formatMessage).join("\n");

	// Human activity signals
	const lastHumanIndex = conversationHistory.findLastIndex(
		(m) => m.senderType === "human_agent" && m.visibility === "public"
	);
	const messagesSinceHuman =
		lastHumanIndex >= 0 ? conversationHistory.length - 1 - lastHumanIndex : -1;
	let lastHumanPublicAt: number | null = null;
	if (lastHumanIndex >= 0) {
		const ts = conversationHistory[lastHumanIndex]?.timestamp;
		const parsed = ts ? Date.parse(ts) : Number.NaN;
		if (!Number.isNaN(parsed)) {
			lastHumanPublicAt = parsed;
		}
	}
	const humanActive =
		lastHumanPublicAt !== null
			? Date.now() - lastHumanPublicAt <= 2 * 60 * 1000
			: messagesSinceHuman >= 0 && messagesSinceHuman <= 1;

	let visitorBurstCount = 0;
	for (let i = conversationHistory.length - 1; i >= 0; i--) {
		if (conversationHistory[i].senderType === "visitor") {
			visitorBurstCount++;
		} else {
			break;
		}
	}

	return `Decide one: respond, observe, assist_team.

Rules:
- respond = reply to visitor
- observe = stay silent
- assist_team = internal note only (no visitor reply)

Signals:
- humanActive: ${humanActive}
- hasHumanAssignee: ${conversationState.hasHumanAssignee}
- escalated: ${conversationState.isEscalated}
- visitorBurst: ${visitorBurstCount}
- latestVisibility: ${triggerMessage.visibility}

Conversation:
${formattedMessages}

Latest:
${formatMessage(triggerMessage)}`;
}

/**
 * Model for decision - use fast, cheap model
 */
const DECISION_MODEL = "openai/gpt-4o-mini";

/**
 * Run smart decision to determine if AI should respond
 *
 * Uses a lightweight AI call to evaluate:
 * - Is there a human actively handling this?
 * - Is this message directed at the AI or the human?
 * - Is a response actually needed?
 */
export async function runSmartDecision(
	input: SmartDecisionInput
): Promise<SmartDecisionResult> {
	const convId = input.conversation.id;

	console.log(
		`[ai-agent:smart-decision] conv=${convId} | Running smart decision`
	);

	try {
		const prompt = buildDecisionPrompt(input);

		// Use Output.object for structured response (not tools)
		const result = await generateText({
			model: createModelRaw(DECISION_MODEL),
			output: Output.object({
				schema: decisionSchema,
			}),
			prompt, // Use prompt directly, not messages array
			temperature: 0, // Deterministic decisions
		});

		// Get the structured output
		const decision = result.output;

		if (!decision) {
			console.warn(
				`[ai-agent:smart-decision] conv=${convId} | No output, defaulting to observe`
			);
			return {
				intent: "observe",
				reasoning: "Smart decision returned no output, defaulting to observe",
				confidence: "low",
			};
		}

		console.log(
			`[ai-agent:smart-decision] conv=${convId} | intent=${decision.intent} confidence=${decision.confidence} | "${decision.reasoning}"`
		);

		// Log token usage for monitoring
		if (result.usage) {
			console.log(
				`[ai-agent:smart-decision] conv=${convId} | tokens: in=${result.usage.inputTokens} out=${result.usage.outputTokens}`
			);
		}

		return {
			intent: decision.intent,
			reasoning: decision.reasoning,
			confidence: decision.confidence,
		};
	} catch (error) {
		console.error(`[ai-agent:smart-decision] conv=${convId} | Error:`, error);

		// On error, default to observe to avoid low-confidence interruptions.
		return {
			intent: "observe",
			reasoning: "Smart decision failed, defaulting to observe",
			confidence: "low",
		};
	}
}

/**
 * Check if smart decision should be used for this message
 *
 * Smart decision is ALWAYS used for visitor messages.
 * This ensures consistent AI behavior and prevents unwanted responses.
 *
 * Skip smart decision ONLY when:
 * - Sender is not a visitor (team messages handled differently)
 */
export function shouldUseSmartDecision(input: {
	triggerMessage: RoleAwareMessage | null;
	conversationHistory: RoleAwareMessage[];
}): boolean {
	const { triggerMessage } = input;

	// Only for visitor messages - smart decision is OBLIGATORY for all visitor messages
	if (!triggerMessage || triggerMessage.senderType !== "visitor") {
		return false;
	}

	// Always use smart decision for visitor messages
	// This ensures the AI properly evaluates whether to respond
	return true;
}
