/**
 * Pipeline Step 2a: Smart Decision
 *
 * Uses AI to decide whether the AI agent should act on a trigger
 * (respond, observe, or assist privately).
 *
 * This is used for non-obvious cases after deterministic shortcuts.
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
	const lastHumanSecondsAgo =
		lastHumanPublicAt !== null
			? Math.max(0, Math.round((Date.now() - lastHumanPublicAt) / 1000))
			: null;

	let visitorBurstCount = 0;
	for (let i = conversationHistory.length - 1; i >= 0; i--) {
		if (conversationHistory[i].senderType === "visitor") {
			visitorBurstCount++;
		} else {
			break;
		}
	}

	return `You are the decision gate for a support AI.

Pick one intent:
- respond: AI should take this turn now
- observe: AI should not act this turn
- assist_team: internal/private help only (no visitor-facing message)

Intent guidance:
- For visitor triggers, "respond" means reply to the visitor.
- For human-agent triggers, "respond" means execute the teammate's request (can be public or private as needed).
- "assist_team" means leave internal guidance only.

Decision policy:
- Prioritize natural conversation flow; do not interrupt an active human unless helpful.
- Prefer respond for visitor greetings/openers ("hi", "hey", "hello"), unanswered questions, or repeated visitor follow-ups.
- Prefer observe for pure acknowledgements/banter when no clear help is needed.
- Prefer respond when a teammate asks AI to message or update the visitor.
- Prefer assist_team when the teammate request is analysis/planning/handoff context.
- If uncertain, choose the option that avoids visitor dead-ends.

Signals:
- triggerSender: ${triggerMessage.senderType}
- triggerVisibility: ${triggerMessage.visibility}
- humanActive: ${humanActive}
- lastHumanSecondsAgo: ${lastHumanSecondsAgo ?? "none"}
- messagesSinceHuman: ${messagesSinceHuman >= 0 ? messagesSinceHuman : "none"}
- hasHumanAssignee: ${conversationState.hasHumanAssignee}
- escalated: ${conversationState.isEscalated}
- visitorBurst: ${visitorBurstCount}

Conversation:
${formattedMessages}

Latest trigger:
${formatMessage(triggerMessage)}

Return concise reasoning (max 1 sentence).`;
}

/**
 * Model for decision - use fast, cheap model
 */
const DECISION_MODEL = "google/gemini-2.5-flash";

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
 * This helper returns true for any non-null, non-AI trigger.
 * Deterministic skip/respond shortcuts can run before this gate.
 */
export function shouldUseSmartDecision(input: {
	triggerMessage: RoleAwareMessage | null;
	conversationHistory: RoleAwareMessage[];
}): boolean {
	const { triggerMessage } = input;

	if (!triggerMessage) {
		return false;
	}

	return triggerMessage.senderType !== "ai_agent";
}
