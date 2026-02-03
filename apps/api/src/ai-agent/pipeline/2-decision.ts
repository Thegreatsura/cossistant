/**
 * Pipeline Step 2: Decision
 *
 * This step determines if and how the AI agent should respond.
 *
 * IMPORTANT: Smart decision is a last resort.
 * Prefer deterministic heuristics to minimize tokens and latency.
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

const MENTION_REGEX = /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g;
const AI_TAG_REGEX = /(^|\s)(@ai|\/ai)(?=\s|$|[.,!?])/i;
const TEXT_MENTION_REGEX = /@([a-zA-Z0-9][a-zA-Z0-9 _-]{0,60})/g;
const PLAIN_TAG_REGEX = /[.,!?]+$/;
const REMOVE_TAG_REGEX = /^(@ai|\/ai)(\s+|$)/i;

const GREETING_REGEX =
	/^(hi|hey|hello|yo|hiya|heya|howdy|sup|what's up|good\s*(morning|afternoon|evening))\b/i;
const ACK_REGEX =
	/^(ok|okay|k|thanks|thank\s*you|thx|ty|got\s*it|cool|great|awesome|perfect|sounds\s*good|alright|all\s*good)\b/i;
const QUESTION_START_REGEX =
	/^(who|what|when|where|why|how|can|could|would|should|do|does|did|is|are|am|will|may|might|help|support)\b/i;
const REQUEST_REGEX = /\b(help|need|issue|problem|trouble)\b/i;

/**
 * Determine if and how the AI agent should act
 */
export async function decide(input: DecisionInput): Promise<DecisionResult> {
	const { triggerMessage, conversationState, aiAgent, conversationHistory } =
		input;
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

	// AI paused - never respond
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

	const tagResult = detectAiTag(triggerMessage, aiAgent);
	const cleanedText = tagResult.cleanedText;
	const classification = classifyTriggerMessage(triggerMessage, cleanedText);

	// Explicit tag - always respond
	if (tagResult.tagged) {
		const baseMode =
			triggerMessage.senderType === "human_agent"
				? "respond_to_command"
				: "respond_to_visitor";
		const mode = classification.isPrivate ? "background_only" : baseMode;
		const humanCommand =
			triggerMessage.senderType === "human_agent"
				? stripLeadingTag(cleanedText, aiAgent.name)
				: null;

		console.log(
			`[ai-agent:decision] conv=${convId} | Explicit tag detected (${tagResult.source}), responding`
		);
		return {
			shouldAct: true,
			reason: "AI was explicitly tagged",
			mode,
			humanCommand,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// Private message without explicit tag
	if (classification.isPrivate) {
		if (classification.isQuestion || classification.isRequest) {
			console.log(
				`[ai-agent:decision] conv=${convId} | Private request detected, responding privately`
			);
			return {
				shouldAct: true,
				reason: "Private request/question",
				mode: "background_only",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
			};
		}

		console.log(
			`[ai-agent:decision] conv=${convId} | Private non-request, skipping`
		);
		return {
			shouldAct: false,
			reason: "Private message not requesting assistance",
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// Visitor public message - heuristic-first
	if (triggerMessage.senderType === "visitor") {
		const visitorBurst = countVisitorBurst(conversationHistory);
		const humanActivity = getHumanActivity(
			conversationHistory,
			conversationState
		);

		if (!humanActivity.humanActive) {
			console.log(
				`[ai-agent:decision] conv=${convId} | No active human, responding`
			);
			return {
				shouldAct: true,
				reason: "No active human agent detected",
				mode: "respond_to_visitor",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
			};
		}

		if (visitorBurst >= 2) {
			console.log(
				`[ai-agent:decision] conv=${convId} | Visitor burst (${visitorBurst}), responding`
			);
			return {
				shouldAct: true,
				reason: "Visitor sent multiple messages without response",
				mode: "respond_to_visitor",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
			};
		}

		if (
			(classification.isGreeting || classification.isQuestion) &&
			humanActivity.lastHumanPublicAt &&
			Date.now() - humanActivity.lastHumanPublicAt > 2 * 60 * 1000
		) {
			console.log(
				`[ai-agent:decision] conv=${convId} | Greeting/question after idle human, responding`
			);
			return {
				shouldAct: true,
				reason: "Visitor needs response and human has been idle",
				mode: "respond_to_visitor",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
			};
		}

		if (classification.isAck && humanActivity.humanActive) {
			console.log(
				`[ai-agent:decision] conv=${convId} | Acknowledgement with active human, skipping`
			);
			return {
				shouldAct: false,
				reason: "Visitor acknowledgment while human is active",
				mode: "background_only",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
			};
		}

		// Ambiguous visitor case - run smart decision
		console.log(
			`[ai-agent:decision] conv=${convId} | Ambiguous visitor message, running smart decision`
		);

		const smartResult = await runSmartDecision({
			aiAgent: input.aiAgent,
			conversation: input.conversation,
			conversationHistory: input.conversationHistory,
			conversationState,
			triggerMessage,
		});

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
				mode: "background_only",
				humanCommand: null,
				isEscalated: conversationState.isEscalated,
				escalationReason: conversationState.escalationReason,
				smartDecision: smartResult,
			};
		}

		console.log(
			`[ai-agent:decision] conv=${convId} | Smart decision: respond | "${smartResult.reasoning}"`
		);
		return {
			shouldAct: true,
			reason: `Smart decision: ${smartResult.reasoning}`,
			mode: "respond_to_visitor",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
			smartDecision: smartResult,
		};
	}

	// Human public message without explicit tag - skip
	if (triggerMessage.senderType === "human_agent") {
		console.log(
			`[ai-agent:decision] conv=${convId} | Human public message without tag, skipping`
		);
		return {
			shouldAct: false,
			reason: "Human agent is handling the conversation",
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
		};
	}

	// Fallback - run smart decision
	console.log(
		`[ai-agent:decision] conv=${convId} | Fallback to smart decision`
	);

	const smartResult = await runSmartDecision({
		aiAgent: input.aiAgent,
		conversation: input.conversation,
		conversationHistory: input.conversationHistory,
		conversationState,
		triggerMessage,
	});

	if (smartResult.intent === "observe") {
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
		return {
			shouldAct: true,
			reason: `Smart decision: ${smartResult.reasoning}`,
			mode: "background_only",
			humanCommand: null,
			isEscalated: conversationState.isEscalated,
			escalationReason: conversationState.escalationReason,
			smartDecision: smartResult,
		};
	}

	return {
		shouldAct: true,
		reason: `Smart decision: ${smartResult.reasoning}`,
		mode: "respond_to_visitor",
		humanCommand: null,
		isEscalated: conversationState.isEscalated,
		escalationReason: conversationState.escalationReason,
		smartDecision: smartResult,
	};
}

function stripMentionMarkdown(text: string): string {
	return text.replace(MENTION_REGEX, (_raw, name) => `@${name}`);
}

function normalizeName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function detectMarkdownMention(text: string, aiAgentId: string): boolean {
	for (const match of text.matchAll(MENTION_REGEX)) {
		const type = (match[2] ?? "").toLowerCase();
		const id = match[3] ?? "";
		if (id === aiAgentId && (type === "ai-agent" || type === "ai_agent")) {
			return true;
		}
	}
	return false;
}

function detectPlainTextTag(text: string, aiAgentName: string): boolean {
	if (AI_TAG_REGEX.test(text)) {
		return true;
	}

	const normalizedAgentName = normalizeName(aiAgentName);
	if (!normalizedAgentName) {
		return false;
	}
	const normalizedAgentNoSpace = normalizedAgentName.replace(/\s+/g, "");

	for (const match of text.matchAll(TEXT_MENTION_REGEX)) {
		const raw = (match[1] ?? "").replace(PLAIN_TAG_REGEX, "");

		const normalized = normalizeName(raw);
		if (!normalized) {
			continue;
		}
		if (normalized === normalizedAgentName) {
			return true;
		}
		if (normalized.replace(/\s+/g, "") === normalizedAgentNoSpace) {
			return true;
		}
	}

	return false;
}

function stripLeadingTag(text: string, aiAgentName: string): string {
	let cleaned = text.trim();

	// Remove @ai or /ai at start
	cleaned = cleaned.replace(REMOVE_TAG_REGEX, "").trim();

	// Remove @AgentName at start (best-effort, supports spaces)
	if (cleaned.startsWith("@")) {
		const normalizedAgentName = normalizeName(aiAgentName);
		if (normalizedAgentName) {
			const words = cleaned.slice(1).split(/\s+/);
			const agentWordCount = aiAgentName.trim().split(/\s+/).length;
			const candidate = words.slice(0, agentWordCount).join(" ");
			const normalizedCandidate = normalizeName(candidate);
			if (
				normalizedCandidate === normalizedAgentName ||
				normalizedCandidate.replace(/\s+/g, "") ===
					normalizedAgentName.replace(/\s+/g, "")
			) {
				cleaned = words.slice(agentWordCount).join(" ").trim();
			}
		}
	}

	return cleaned || text.trim();
}

function detectAiTag(
	message: RoleAwareMessage,
	aiAgent: AiAgentSelect
): {
	tagged: boolean;
	source: "markdown" | "text" | null;
	cleanedText: string;
} {
	const cleanedText = stripMentionMarkdown(message.content);

	if (detectMarkdownMention(message.content, aiAgent.id)) {
		return { tagged: true, source: "markdown", cleanedText };
	}

	if (detectPlainTextTag(cleanedText, aiAgent.name)) {
		return { tagged: true, source: "text", cleanedText };
	}

	return { tagged: false, source: null, cleanedText };
}

function classifyTriggerMessage(
	message: RoleAwareMessage,
	cleanedText: string
): {
	isPrivate: boolean;
	isGreeting: boolean;
	isAck: boolean;
	isQuestion: boolean;
	isRequest: boolean;
	text: string;
} {
	const text = cleanedText.trim();
	const isGreeting = GREETING_REGEX.test(text);
	const isAck = ACK_REGEX.test(text);
	const isQuestion = QUESTION_START_REGEX.test(text) || text.includes("?");
	const isRequest = REQUEST_REGEX.test(text);

	return {
		isPrivate: message.visibility === "private",
		isGreeting,
		isAck,
		isQuestion,
		isRequest,
		text,
	};
}

function countVisitorBurst(history: RoleAwareMessage[]): number {
	let count = 0;
	for (let i = history.length - 1; i >= 0; i--) {
		const msg = history[i];
		if (msg.senderType === "visitor") {
			count++;
		} else {
			break;
		}
	}
	return count;
}

function getHumanActivity(
	history: RoleAwareMessage[],
	conversationState: ConversationState
): {
	humanActive: boolean;
	lastHumanPublicAt: number | null;
	messagesSinceHuman: number | null;
} {
	let lastHumanIndex = -1;
	for (let i = history.length - 1; i >= 0; i--) {
		const msg = history[i];
		if (msg.senderType === "human_agent" && msg.visibility === "public") {
			lastHumanIndex = i;
			break;
		}
	}

	const messagesSinceHuman =
		lastHumanIndex >= 0 ? history.length - 1 - lastHumanIndex : null;

	let lastHumanPublicAt: number | null = null;
	if (lastHumanIndex >= 0) {
		const ts = history[lastHumanIndex]?.timestamp;
		const parsed = ts ? Date.parse(ts) : Number.NaN;
		if (!Number.isNaN(parsed)) {
			lastHumanPublicAt = parsed;
		}
	}

	const withinWindow =
		lastHumanPublicAt !== null
			? Date.now() - lastHumanPublicAt <= 2 * 60 * 1000
			: false;
	const hasRecentHuman =
		messagesSinceHuman !== null &&
		messagesSinceHuman <= 1 &&
		conversationState.hasHumanAssignee;

	return {
		humanActive: withinWindow || hasRecentHuman,
		lastHumanPublicAt,
		messagesSinceHuman,
	};
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
