/**
 * Pipeline Step 3: Generation
 *
 * This step generates the AI response using the LLM with tools.
 * It builds the prompt dynamically based on context and behavior settings.
 *
 * KEY DESIGN: Tools-only approach (no structured output)
 * The AI MUST call tools for everything:
 * - sendMessage() to communicate with visitor
 * - sendPrivateMessage() to leave notes for team
 * - respond()/escalate()/resolve()/etc. to signal completion
 *
 * This forces the model to use tools rather than skipping them.
 */

import type { Database } from "@api/db";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { env } from "@api/env";
import {
	createModel,
	generateText,
	hasToolCall,
	stepCountIs,
} from "@api/lib/ai";
import {
	detectPromptInjection,
	logInjectionAttempt,
} from "../analysis/injection";
import type { RoleAwareMessage } from "../context/conversation";
import type { VisitorContext } from "../context/visitor";
import type { AiDecision } from "../output/schemas";
import { buildSystemPrompt } from "../prompts/system";
import {
	createActionCapture,
	getCapturedAction,
	getRepairTools,
	getToolsForGeneration,
	resetCapturedAction,
	type ToolContext,
} from "../tools";
import type { ContinuationHint } from "./1b-continuation-gate";
import type { ResponseMode } from "./2-decision";
import type { SmartDecisionResult } from "./2a-smart-decision";

export type GenerationResult = {
	decision: AiDecision;
	/** Whether generation was aborted due to cancellation */
	aborted?: boolean;
	/** Whether a repair attempt failed and fallback messaging is required */
	needsFallbackMessage?: boolean;
	usage?: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	/** Tool call counts from this generation */
	toolCalls?: {
		sendMessage: number;
		sendPrivateMessage: number;
	};
};

type GenerationInput = {
	db: Database;
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	conversationHistory: RoleAwareMessage[];
	visitorContext: VisitorContext | null;
	mode: ResponseMode;
	humanCommand: string | null;
	organizationId: string;
	websiteId: string;
	visitorId: string;
	/** Trigger message ID - used for idempotency keys in tools */
	triggerMessageId: string;
	/** Trigger message timestamp */
	triggerMessageCreatedAt?: string;
	/** Trigger sender type */
	triggerSenderType?: "visitor" | "human_agent" | "ai_agent";
	/** Trigger visibility */
	triggerVisibility?: "public" | "private";
	/** Optional abort signal for interruption handling */
	abortSignal?: AbortSignal;
	/** Callback to stop the typing indicator just before a message is sent */
	stopTyping?: () => Promise<void>;
	/** Callback to start/restart the typing indicator during inter-message delays */
	startTyping?: () => Promise<void>;
	/** Callback when a public message send resolves */
	onPublicMessageSent?: ToolContext["onPublicMessageSent"];
	/** Whether public visitor messages are allowed */
	allowPublicMessages: boolean;
	/** Whether conversation is currently escalated */
	isEscalated?: boolean;
	/** Reason for escalation if escalated */
	escalationReason?: string | null;
	/** Smart decision result if AI was used to decide */
	smartDecision?: SmartDecisionResult;
	/** Continuation hint when a queued trigger needs incremental follow-up only */
	continuationHint?: ContinuationHint;
	/** Workflow run ID for progress events */
	workflowRunId?: string;
};

/**
 * Generate AI response using LLM with tools
 *
 * The AI must use tools for everything - there's no structured output.
 * This ensures the model actually calls sendMessage() to respond.
 *
 * Supports interruption via AbortSignal for cancellation.
 */
export async function generate(
	input: GenerationInput
): Promise<GenerationResult> {
	const {
		db,
		aiAgent,
		conversation,
		conversationHistory,
		visitorContext,
		mode,
		humanCommand,
		organizationId,
		websiteId,
		visitorId,
		triggerMessageId,
		triggerMessageCreatedAt,
		triggerSenderType,
		triggerVisibility,
		abortSignal,
		stopTyping,
		startTyping,
		onPublicMessageSent,
		allowPublicMessages,
		isEscalated,
		escalationReason,
		smartDecision,
		continuationHint,
		workflowRunId,
	} = input;
	const convId = conversation.id;

	const actionCapture = createActionCapture();

	// Build tool context for passing to tool execute functions
	// Counters are mutable objects that track message idempotency within this generation
	const toolContext: ToolContext = {
		db,
		conversation,
		conversationId: conversation.id,
		organizationId,
		websiteId,
		visitorId,
		aiAgentId: aiAgent.id,
		allowPublicMessages,
		triggerMessageId,
		triggerMessageCreatedAt,
		triggerSenderType,
		triggerVisibility,
		counters: {
			sendMessage: 0,
			sendPrivateMessage: 0,
		},
		// Callback to stop typing indicator just before a message is sent
		stopTyping,
		// Callback to start/restart typing indicator during delays between messages
		startTyping,
		// Callback to report successful public sends to the pipeline
		onPublicMessageSent,
		// Escalation state - prevents re-escalation
		isEscalated,
		// Workflow run ID for progress events
		workflowRunId,
		// Per-generation captured action store (concurrency-safe)
		actionCapture,
	};

	// Reset captured action before generation
	resetCapturedAction(actionCapture);

	// Get tools for this agent based on settings (with bound context)
	const tools = getToolsForGeneration(aiAgent, toolContext);

	// Build dynamic system prompt with real-time context and tool instructions
	const systemPrompt = buildSystemPrompt({
		aiAgent,
		conversation,
		conversationHistory,
		visitorContext,
		mode,
		humanCommand,
		tools,
		isEscalated,
		escalationReason,
		smartDecision,
		continuationHint,
	});

	// Format conversation history for LLM with multi-party prefixes
	const visitorName = visitorContext?.name ?? null;
	const messages = formatMessagesForLlm(conversationHistory, visitorName);

	console.log(
		`[ai-agent:generate] conv=${convId} | model=${aiAgent.model} | messages=${messages.length} | mode=${mode} | tools=${tools ? Object.keys(tools).length : 0}`
	);

	// Check for potential prompt injection in the latest visitor message (for monitoring)
	const latestVisitorMessage = conversationHistory
		.filter((m) => m.senderType === "visitor")
		.pop();
	if (latestVisitorMessage) {
		const injectionResult = detectPromptInjection(latestVisitorMessage.content);
		if (injectionResult.detected) {
			logInjectionAttempt(
				convId,
				injectionResult,
				latestVisitorMessage.content
			);
			// Note: We don't block the message - the AI handles it via security prompt
			// The logging is for monitoring and improving detection patterns
		}
	}

	// In development, log the full system prompt for debugging
	if (env.NODE_ENV === "development") {
		console.log(
			`[ai-agent:generate] conv=${convId} | FULL SYSTEM PROMPT:\n${"=".repeat(80)}\n${systemPrompt}\n${"=".repeat(80)}`
		);
	} else {
		console.log(
			`[ai-agent:generate] conv=${convId} | System prompt (${systemPrompt.length} chars): "${systemPrompt.slice(0, 200).replace(/\n/g, " ")}..."`
		);
	}

	// Generate using tools-only approach (no structured output)
	// The AI MUST call tools:
	// 1. sendMessage() to respond to visitor
	// 2. respond()/escalate()/resolve() to signal completion
	//
	// Key configurations:
	// - toolChoice: 'required' forces the model to call tools (can't skip them)
	// - stopWhen: stops generation when an action tool is called OR after 10 steps
	// - abortSignal: allows interruption when new message arrives
	let result: Awaited<ReturnType<typeof generateText>>;
	try {
		result = await generateText({
			model: createModel(aiAgent.model),
			tools,
			toolChoice: "required", // Force the model to call tools
			stopWhen: [
				// Stop when any action tool is called
				hasToolCall("respond"),
				hasToolCall("escalate"),
				hasToolCall("resolve"),
				hasToolCall("markSpam"),
				hasToolCall("skip"),
				// Safety limit: stop after 10 steps regardless
				stepCountIs(10),
			],
			system: systemPrompt,
			messages,
			// Use temperature 0 for deterministic tool calling (AI SDK best practice)
			// This reduces randomness and improves tool call reliability
			temperature: 0,
			// Support interruption via AbortSignal
			abortSignal,
		});
	} catch (error) {
		// Handle abort gracefully - this means a new message arrived
		if (error instanceof Error && error.name === "AbortError") {
			console.log(
				`[ai-agent:generate] conv=${convId} | Generation aborted - new message arrived`
			);
			return {
				decision: {
					action: "skip" as const,
					reasoning: "Generation aborted due to new message arriving",
					confidence: 1,
				},
				aborted: true,
				toolCalls: {
					sendMessage: toolContext.counters?.sendMessage ?? 0,
					sendPrivateMessage: toolContext.counters?.sendPrivateMessage ?? 0,
				},
			};
		}
		// Re-throw other errors
		throw error;
	}

	// Log tool call information for debugging
	const allToolCalls =
		result.steps?.flatMap((step) => step.toolCalls ?? []) ?? [];
	const sendMessageCalls = allToolCalls.filter(
		(tc) => tc.toolName === "sendMessage"
	);
	const sendPrivateMessageCalls = allToolCalls.filter(
		(tc) => tc.toolName === "sendPrivateMessage"
	);
	const actionCalls = allToolCalls.filter((tc) =>
		["respond", "escalate", "resolve", "markSpam", "skip"].includes(tc.toolName)
	);

	console.log(
		`[ai-agent:generate] conv=${convId} | Steps: ${result.steps?.length ?? 0} | Tool calls: sendMessage=${sendMessageCalls.length}, sendPrivateMessage=${sendPrivateMessageCalls.length}, action=${actionCalls.length}`
	);

	// Get the captured action from action tools
	const capturedAction = getCapturedAction(actionCapture);

	const requiresMessage = Boolean(
		capturedAction &&
			["respond", "escalate", "resolve"].includes(capturedAction.action)
	);
	const missingRequiredMessage =
		requiresMessage && sendMessageCalls.length === 0;
	const missingAction = !capturedAction;

	if (
		toolContext.allowPublicMessages &&
		(missingAction || missingRequiredMessage)
	) {
		const repairReason = missingAction
			? "missing_action"
			: "missing_send_message";
		console.warn(
			`[ai-agent:generate] conv=${convId} | Repair triggered (${repairReason})`
		);

		const repairTools = getRepairTools(toolContext);
		if (repairTools) {
			// Reset captured action before repair generation
			resetCapturedAction(actionCapture);

			const repairPrompt = `${buildSystemPrompt({
				aiAgent,
				conversation,
				conversationHistory,
				visitorContext,
				mode,
				humanCommand,
				tools: repairTools,
				isEscalated,
				escalationReason,
				smartDecision,
				continuationHint,
			})}\n\n## Repair Mode\n\nYou must complete this turn using ONLY these tools:\n- sendMessage(): send a short, safe, helpful reply to the visitor\n- respond(): finish the turn\n\nRules:\n- Call sendMessage() exactly once\n- Call respond() immediately after sendMessage()\n- Do not call any other tools`;

			let repairResult: Awaited<ReturnType<typeof generateText>>;
			try {
				repairResult = await generateText({
					model: createModel(aiAgent.model),
					tools: repairTools,
					toolChoice: "required",
					stopWhen: [hasToolCall("respond"), stepCountIs(3)],
					system: repairPrompt,
					messages,
					temperature: 0,
					abortSignal,
				});
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					console.log(
						`[ai-agent:generate] conv=${convId} | Repair aborted - new message arrived`
					);
					return {
						decision: {
							action: "skip" as const,
							reasoning: "Repair aborted due to new message arriving",
							confidence: 1,
						},
						aborted: true,
						toolCalls: {
							sendMessage: toolContext.counters?.sendMessage ?? 0,
							sendPrivateMessage: toolContext.counters?.sendPrivateMessage ?? 0,
						},
					};
				}
				throw error;
			}

			const repairToolCalls =
				repairResult.steps?.flatMap((step) => step.toolCalls ?? []) ?? [];
			const repairSendMessageCalls = repairToolCalls.filter(
				(tc) => tc.toolName === "sendMessage"
			);
			const repairSendPrivateMessageCalls = repairToolCalls.filter(
				(tc) => tc.toolName === "sendPrivateMessage"
			);

			const repairAction = getCapturedAction(actionCapture);
			const repairSucceeded = Boolean(
				repairAction &&
					repairAction.action === "respond" &&
					repairSendMessageCalls.length > 0
			);

			if (repairSucceeded && repairAction) {
				console.log(`[ai-agent:generate] conv=${convId} | Repair succeeded`);
				return {
					decision: repairAction,
					usage: repairResult.usage
						? {
								inputTokens: repairResult.usage.inputTokens ?? 0,
								outputTokens: repairResult.usage.outputTokens ?? 0,
								totalTokens: repairResult.usage.totalTokens ?? 0,
							}
						: undefined,
					toolCalls: {
						sendMessage: repairSendMessageCalls.length,
						sendPrivateMessage: repairSendPrivateMessageCalls.length,
					},
				};
			}

			console.warn(
				`[ai-agent:generate] conv=${convId} | Repair failed, sending fallback`
			);
			return {
				decision: {
					action: "respond" as const,
					reasoning: "Repair attempt failed to produce a tool-based response",
					confidence: 0,
				},
				needsFallbackMessage: true,
				usage: repairResult.usage
					? {
							inputTokens: repairResult.usage.inputTokens ?? 0,
							outputTokens: repairResult.usage.outputTokens ?? 0,
							totalTokens: repairResult.usage.totalTokens ?? 0,
						}
					: undefined,
				toolCalls: {
					sendMessage: repairSendMessageCalls.length,
					sendPrivateMessage: repairSendPrivateMessageCalls.length,
				},
			};
		}
	}

	// Validate that we got an action
	if (!capturedAction) {
		console.error(
			`[ai-agent:generate] conv=${convId} | No action tool called! text="${result.text?.slice(0, 200)}"`
		);

		// Return a safe fallback decision
		return {
			decision: {
				action: "skip" as const,
				reasoning:
					"AI did not call an action tool (respond/escalate/resolve). This may indicate a model compatibility issue.",
				confidence: 0,
			},
			usage: result.usage
				? {
						inputTokens: result.usage.inputTokens ?? 0,
						outputTokens: result.usage.outputTokens ?? 0,
						totalTokens: result.usage.totalTokens ?? 0,
					}
				: undefined,
			toolCalls: {
				sendMessage: sendMessageCalls.length,
				sendPrivateMessage: sendPrivateMessageCalls.length,
			},
		};
	}

	// Warn if no sendMessage was called for respond/escalate/resolve actions
	if (requiresMessage && sendMessageCalls.length === 0) {
		console.warn(
			`[ai-agent:generate] conv=${convId} | WARNING: Action "${capturedAction.action}" without sendMessage! The visitor won't see a response.`
		);
	}

	// Extract usage data from AI SDK response
	const usage = result.usage;
	console.log(
		`[ai-agent:generate] conv=${convId} | AI decided: action=${capturedAction.action} | reasoning="${(capturedAction.reasoning ?? "").slice(0, 100)}${(capturedAction.reasoning ?? "").length > 100 ? "..." : ""}"`
	);

	if (usage) {
		console.log(
			`[ai-agent:generate] conv=${convId} | Tokens: input=${usage.inputTokens ?? 0} output=${usage.outputTokens ?? 0} total=${usage.totalTokens ?? 0}`
		);
	}

	return {
		decision: capturedAction,
		usage: usage
			? {
					inputTokens: usage.inputTokens ?? 0,
					outputTokens: usage.outputTokens ?? 0,
					totalTokens: usage.totalTokens ?? 0,
				}
			: undefined,
		toolCalls: {
			sendMessage: sendMessageCalls.length,
			sendPrivateMessage: sendPrivateMessageCalls.length,
		},
	};
}

/**
 * Build message prefix based on sender type and visibility
 *
 * Prefix Protocol:
 * - [VISITOR] or [VISITOR:name] for visitor messages
 * - [TEAM:name] for human agent messages
 * - [AI] for AI agent messages
 * - [PRIVATE] prefix for private/internal messages
 *
 * This helps the AI reliably understand who is speaking and
 * which messages are internal team communications.
 */
function buildMessagePrefix(
	msg: RoleAwareMessage,
	visitorName: string | null
): string {
	const isPrivate = msg.visibility === "private";
	const privatePrefix = isPrivate ? "[PRIVATE]" : "";

	switch (msg.senderType) {
		case "visitor":
			// Visitor messages are always public
			return visitorName ? `[VISITOR:${visitorName}]` : "[VISITOR]";

		case "human_agent": {
			const humanName = msg.senderName || "Team Member";
			return `${privatePrefix}[TEAM:${humanName}]`;
		}

		case "ai_agent":
			return `${privatePrefix}[AI]`;

		default:
			return "";
	}
}

/**
 * Format role-aware messages for LLM consumption
 *
 * Uses AI SDK message format with prefixed content for multi-party context:
 * - Visitor messages → role: "user" with [VISITOR] or [VISITOR:name] prefix
 * - Human/AI messages → role: "assistant" with [TEAM:name] or [AI] prefix
 * - Private messages get [PRIVATE] prefix
 */
function formatMessagesForLlm(
	messages: RoleAwareMessage[],
	visitorName: string | null
): Array<{ role: "user" | "assistant"; content: string }> {
	return messages.map((msg) => {
		// Visitor messages are "user", everything else is "assistant"
		const role = msg.senderType === "visitor" ? "user" : "assistant";

		// Build prefix based on sender type and visibility
		const prefix = buildMessagePrefix(msg, visitorName);

		// Combine prefix with content
		const content = prefix ? `${prefix} ${msg.content}` : msg.content;

		return { role, content };
	});
}
