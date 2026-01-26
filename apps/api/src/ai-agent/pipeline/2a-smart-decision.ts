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
 * Select relevant messages for context
 *
 * Strategy:
 * 1. Always include recent consecutive messages from current speaker burst
 * 2. Include the last exchange between different parties
 * 3. Include any human agent messages (they're important for context)
 * 4. Cap at ~15 messages to stay token-efficient
 */
function selectRelevantMessages(
	history: RoleAwareMessage[],
	triggerMessage: RoleAwareMessage
): RoleAwareMessage[] {
	if (history.length === 0) {
		return [];
	}

	const MAX_MESSAGES = 15;
	const result: RoleAwareMessage[] = [];
	const seen = new Set<string>();

	// Helper to add message if not already added
	const addMessage = (msg: RoleAwareMessage) => {
		const key = `${msg.messageId}-${msg.content.slice(0, 50)}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(msg);
		}
	};

	// 1. Get the current "burst" - consecutive messages from same sender at the end
	const currentBurst: RoleAwareMessage[] = [];
	for (let i = history.length - 1; i >= 0; i--) {
		const msg = history[i];
		if (msg.senderType === triggerMessage.senderType) {
			currentBurst.unshift(msg);
		} else {
			break;
		}
	}

	// 2. Find the last exchange point (where sender changed)
	const exchangeStartIndex = history.length - currentBurst.length;

	// 3. Get messages before the burst to understand context
	// Look for the previous exchange (back-and-forth)
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

	// 4. Always include ALL human agent messages (they're rare and important)
	const humanAgentMessages = history.filter(
		(m) => m.senderType === "human_agent"
	);

	// Build final list: context + burst + human messages
	// Priority: human messages > context > burst
	for (const msg of humanAgentMessages) {
		addMessage(msg);
	}
	for (const msg of contextMessages) {
		addMessage(msg);
	}
	for (const msg of currentBurst) {
		addMessage(msg);
	}

	// Sort by original order and cap
	const sortedResult = result
		.sort((a, b) => {
			const aIndex = history.findIndex((m) => m.messageId === a.messageId);
			const bIndex = history.findIndex((m) => m.messageId === b.messageId);
			return aIndex - bIndex;
		})
		.slice(-MAX_MESSAGES);

	return sortedResult;
}

/**
 * Format a message for the prompt
 */
function formatMessage(msg: RoleAwareMessage): string {
	const prefix =
		msg.senderType === "visitor"
			? "[VISITOR]"
			: msg.senderType === "human_agent"
				? `[TEAM:${msg.senderName || "Agent"}]`
				: "[AI]";
	return `${prefix} ${msg.content}`;
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

	// Check if human agent is present and active
	const hasHumanAgent = conversationHistory.some(
		(m) => m.senderType === "human_agent"
	);

	// Check when human last spoke (in terms of messages ago)
	const lastHumanIndex = conversationHistory.findLastIndex(
		(m) => m.senderType === "human_agent"
	);
	const messagesSinceHuman =
		lastHumanIndex >= 0 ? conversationHistory.length - 1 - lastHumanIndex : -1;

	// Build context notes
	const contextNotes: string[] = [];

	// Human agent context
	if (hasHumanAgent) {
		if (messagesSinceHuman === 0) {
			contextNotes.push(
				"A human agent just sent the previous message - they are actively engaged."
			);
		} else if (messagesSinceHuman > 0 && messagesSinceHuman <= 3) {
			contextNotes.push(
				`A human agent spoke ${messagesSinceHuman} message(s) ago - they may still be engaged.`
			);
		} else if (messagesSinceHuman > 3) {
			contextNotes.push(
				`A human agent is in the conversation but hasn't spoken in ${messagesSinceHuman} messages.`
			);
		}
	} else {
		contextNotes.push(
			"No human agent is in this conversation - you are the only support available."
		);
	}

	// Escalation context
	if (conversationState.isEscalated) {
		contextNotes.push(
			`Conversation is escalated: ${conversationState.escalationReason || "Human support requested"}`
		);
	}

	// Count recent visitor messages in a row
	let visitorBurstCount = 0;
	for (let i = conversationHistory.length - 1; i >= 0; i--) {
		if (conversationHistory[i].senderType === "visitor") {
			visitorBurstCount++;
		} else {
			break;
		}
	}
	if (visitorBurstCount > 1) {
		contextNotes.push(
			`Visitor has sent ${visitorBurstCount} messages in a row without a response.`
		);
	}

	// Determine who sent the trigger message
	const isFromHuman = triggerMessage.senderType === "human_agent";
	const isFromVisitor = triggerMessage.senderType === "visitor";

	return `You are an AI support assistant deciding whether to respond to the latest message in a conversation.

PARTICIPANTS:
- [VISITOR]: The customer seeking help
- [TEAM:name]: Human support agents (your teammates, if present)
- [AI]: You (the AI assistant)

CURRENT SITUATION:
${contextNotes.map((n) => `- ${n}`).join("\n")}
- Latest message is from: ${isFromHuman ? "a human agent (your teammate)" : isFromVisitor ? "the visitor" : "unknown"}

WHEN TO RESPOND:
- Visitor asks a question or needs help
- You are the only support available (no human agent)
- Human agent is not actively handling the conversation
- You can provide value (answer questions, provide information)
- Visitor seems to be waiting for any response
${isFromHuman ? "- Human agent sent a message and might need your help or input" : ""}

WHEN TO OBSERVE (stay silent):
- Human agent is actively engaged in conversation with visitor
- The message is clearly not directed at you
- Message is just a simple acknowledgment ("ok", "thanks", "got it") AND someone just helped them
- You would just be interrupting an ongoing exchange
${isFromHuman ? "- Human agent is handling things and doesn't need your input" : ""}
- NOTE: If you're the only support available for the visitor, you should almost always respond

WHEN TO ASSIST TEAM (internal note only):
- You have useful context to share with the human agent
- But the human should be the one responding to the visitor
- Only applicable when a human agent is present

CONVERSATION:
${formattedMessages}

LATEST MESSAGE TO EVALUATE:
${formatMessage(triggerMessage)}

Based on the conversation flow and context, decide your action.`;
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
				`[ai-agent:smart-decision] conv=${convId} | No output, defaulting to respond`
			);
			return {
				intent: "respond",
				reasoning: "Smart decision returned no output, defaulting to respond",
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

		// On error, default to responding (safer than silence)
		return {
			intent: "respond",
			reasoning: "Smart decision failed, defaulting to respond",
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
