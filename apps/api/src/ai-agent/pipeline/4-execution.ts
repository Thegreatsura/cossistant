/**
 * Pipeline Step 4: Execution
 *
 * This step executes the AI's chosen actions.
 * All actions are idempotent to support safe retries.
 *
 * Responsibilities:
 * - Execute primary action (respond, escalate, resolve, etc.)
 * - Execute side effects (set priority, categorize, etc.)
 * - Create timeline events
 * - Update conversation state
 */

import type { Database } from "@api/db";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import * as actions from "../actions";
import { validateDecisionForExecution } from "../output/parser";
import type { AiDecision } from "../output/schemas";

export type ExecutionResult = {
	primaryAction: {
		type: string;
		success: boolean;
		messageId?: string;
		error?: string;
	};
	sideEffects: Array<{
		type: string;
		success: boolean;
		error?: string;
	}>;
};

type ExecutionInput = {
	db: Database;
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	decision: AiDecision;
	jobId: string;
	messageId: string; // Trigger message ID - used for idempotency
	organizationId: string;
	websiteId: string;
	visitorId: string;
	visitorName: string;
};

/**
 * Get the visitor-facing message from the decision.
 * Supports both new visitorMessage field and legacy message field.
 */
function getVisitorMessage(decision: AiDecision): string {
	// Prefer visitorMessage, fall back to legacy message field
	return decision.visitorMessage || decision.message || "";
}

/**
 * Execute the AI's chosen actions
 */
export async function execute(input: ExecutionInput): Promise<ExecutionResult> {
	const {
		db,
		aiAgent,
		conversation,
		decision,
		jobId,
		messageId,
		organizationId,
		websiteId,
		visitorId,
		visitorName,
	} = input;
	const convId = conversation.id;

	console.log(
		`[ai-agent:execute] conv=${convId} | Executing action="${decision.action}"`
	);

	// Validate decision before execution
	const validation = validateDecisionForExecution(decision);
	if (!validation.valid) {
		console.error(
			`[ai-agent:execute] conv=${convId} | Invalid decision | error="${validation.error}"`
		);
		return {
			primaryAction: {
				type: decision.action,
				success: false,
				error: validation.error,
			},
			sideEffects: [],
		};
	}

	const result: ExecutionResult = {
		primaryAction: {
			type: decision.action,
			success: false,
		},
		sideEffects: [],
	};

	// Get the visitor message for actions that need it
	const visitorMessage = getVisitorMessage(decision);

	// Execute primary action
	try {
		switch (decision.action) {
			case "respond": {
				const sendResult = await actions.sendMessage({
					db,
					conversationId: conversation.id,
					organizationId,
					websiteId,
					visitorId,
					aiAgentId: aiAgent.id,
					text: visitorMessage,
					idempotencyKey: `${messageId}-respond`,
				});
				result.primaryAction = {
					type: "respond",
					success: true,
					messageId: sendResult.messageId,
				};
				break;
			}

			case "internal_note": {
				// For internal notes, use internalNote field or fall back to message
				const noteText =
					decision.internalNote || decision.message || visitorMessage;
				const noteResult = await actions.addInternalNote({
					db,
					conversationId: conversation.id,
					organizationId,
					aiAgentId: aiAgent.id,
					text: noteText,
					idempotencyKey: `${messageId}-note`,
				});
				result.primaryAction = {
					type: "internal_note",
					success: true,
					messageId: noteResult.noteId,
				};

				// If there's also a visitor message, send it
				if (visitorMessage && visitorMessage !== noteText) {
					await actions.sendMessage({
						db,
						conversationId: conversation.id,
						organizationId,
						websiteId,
						visitorId,
						aiAgentId: aiAgent.id,
						text: visitorMessage,
						idempotencyKey: `${messageId}-note-visitor`,
					});
				}
				break;
			}

			case "escalate": {
				// Escalate already sends a visitor message via the escalation.visitorMessage
				// But also use the top-level visitorMessage if escalation.visitorMessage is missing
				const escalationVisitorMessage =
					decision.escalation?.visitorMessage ||
					visitorMessage ||
					"I'm connecting you with one of our team members who can help you further. They'll be with you shortly!";

				await actions.escalate({
					db,
					conversation,
					organizationId,
					websiteId,
					aiAgentId: aiAgent.id,
					aiAgentName: aiAgent.name,
					reason: decision.escalation?.reason ?? "AI requested escalation",
					visitorMessage: escalationVisitorMessage,
					visitorName,
					assignToUserId: decision.escalation?.assignToUserId,
					urgency: decision.escalation?.urgency ?? "normal",
				});
				result.primaryAction = {
					type: "escalate",
					success: true,
				};
				break;
			}

			case "resolve": {
				// IMPORTANT: Send visitor message BEFORE updating status
				// This ensures the user knows why the conversation was resolved
				if (visitorMessage) {
					await actions.sendMessage({
						db,
						conversationId: conversation.id,
						organizationId,
						websiteId,
						visitorId,
						aiAgentId: aiAgent.id,
						text: visitorMessage,
						idempotencyKey: `${messageId}-resolve-msg`,
					});
				}

				await actions.updateStatus({
					db,
					conversation,
					organizationId,
					aiAgentId: aiAgent.id,
					newStatus: "resolved",
				});
				result.primaryAction = {
					type: "resolve",
					success: true,
				};
				break;
			}

			case "mark_spam": {
				// For spam, we typically don't need to message the visitor
				// But if a message was provided, send it
				if (visitorMessage) {
					await actions.sendMessage({
						db,
						conversationId: conversation.id,
						organizationId,
						websiteId,
						visitorId,
						aiAgentId: aiAgent.id,
						text: visitorMessage,
						idempotencyKey: `${messageId}-spam-msg`,
					});
				}

				await actions.updateStatus({
					db,
					conversation,
					organizationId,
					aiAgentId: aiAgent.id,
					newStatus: "spam",
				});
				result.primaryAction = {
					type: "mark_spam",
					success: true,
				};
				break;
			}

			case "skip": {
				// IMPORTANT: Even on skip, if there's a visitor message, send it
				// This prevents the AI from going completely silent
				if (visitorMessage) {
					await actions.sendMessage({
						db,
						conversationId: conversation.id,
						organizationId,
						websiteId,
						visitorId,
						aiAgentId: aiAgent.id,
						text: visitorMessage,
						idempotencyKey: `${messageId}-skip-msg`,
					});
				}

				result.primaryAction = {
					type: "skip",
					success: true,
				};
				break;
			}

			default: {
				result.primaryAction = {
					type: decision.action,
					success: false,
					error: `Unknown action: ${decision.action}`,
				};
			}
		}
	} catch (error) {
		result.primaryAction = {
			type: decision.action,
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}

	// Handle internal note as a side effect if provided and not the primary action
	if (decision.internalNote && decision.action !== "internal_note") {
		try {
			await actions.addInternalNote({
				db,
				conversationId: conversation.id,
				organizationId,
				aiAgentId: aiAgent.id,
				text: decision.internalNote,
				idempotencyKey: `${messageId}-internal-note`,
			});
			result.sideEffects.push({
				type: "internal_note",
				success: true,
			});
		} catch (error) {
			result.sideEffects.push({
				type: "internal_note",
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	// Execute side effects
	if (decision.sideEffects) {
		// Set priority
		if (decision.sideEffects.setPriority) {
			try {
				await actions.updatePriority({
					db,
					conversation,
					organizationId,
					aiAgentId: aiAgent.id,
					newPriority: decision.sideEffects.setPriority,
				});
				result.sideEffects.push({
					type: "set_priority",
					success: true,
				});
			} catch (error) {
				result.sideEffects.push({
					type: "set_priority",
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		// Add to views (categorize)
		if (decision.sideEffects.addToViews?.length) {
			for (const viewId of decision.sideEffects.addToViews) {
				try {
					await actions.categorize({
						db,
						conversationId: conversation.id,
						organizationId,
						viewId,
						aiAgentId: aiAgent.id,
					});
					result.sideEffects.push({
						type: `add_to_view:${viewId}`,
						success: true,
					});
				} catch (error) {
					result.sideEffects.push({
						type: `add_to_view:${viewId}`,
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}
		}

		// Request participants
		if (decision.sideEffects.requestParticipants?.length) {
			for (const userId of decision.sideEffects.requestParticipants) {
				try {
					await actions.requestHelp({
						db,
						conversationId: conversation.id,
						organizationId,
						userId,
						aiAgentId: aiAgent.id,
						reason: "AI requested assistance",
					});
					result.sideEffects.push({
						type: `request_participant:${userId}`,
						success: true,
					});
				} catch (error) {
					result.sideEffects.push({
						type: `request_participant:${userId}`,
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}
		}
	}

	if (result.primaryAction.success) {
		console.log(
			`[ai-agent:execute] conv=${convId} | Result: success=true | sideEffects=${result.sideEffects.length}`
		);
	} else {
		console.error(
			`[ai-agent:execute] conv=${convId} | FAILED | error="${result.primaryAction.error}"`
		);
	}

	return result;
}
