/**
 * AI Decision Parser
 *
 * Parses and validates AI decision output.
 */

import { type AiDecision, aiDecisionSchema } from "./schemas";

/**
 * Parse and validate an AI decision
 *
 * Returns a validated decision or a fallback "skip" decision on error.
 */
export function parseAiDecision(input: unknown): AiDecision {
	const result = aiDecisionSchema.safeParse(input);

	if (result.success) {
		return result.data;
	}

	console.error("[ai-agent] Failed to parse AI decision:", result.error.issues);

	// Return a safe fallback with a visitor message so we don't go silent
	return {
		action: "skip",
		visitorMessage:
			"I'm having a moment - let me get back to you shortly, or a team member will assist you.",
		reasoning: "Failed to parse AI decision, skipping for safety",
		confidence: 0,
	};
}

/**
 * Get the visitor-facing message from a decision.
 * Supports both new visitorMessage field and legacy message field.
 */
export function getVisitorMessageFromDecision(decision: AiDecision): string {
	return decision.visitorMessage || decision.message || "";
}

/**
 * Validate that a decision is safe to execute
 *
 * Checks that required fields are present for each action type.
 */
export function validateDecisionForExecution(decision: AiDecision): {
	valid: boolean;
	error?: string;
} {
	// Get the visitor message (supports both new and legacy fields)
	const visitorMessage = getVisitorMessageFromDecision(decision);

	switch (decision.action) {
		case "respond":
			// Respond action MUST have a visitor message
			if (!visitorMessage || visitorMessage.trim().length === 0) {
				return {
					valid: false,
					error: `Action "respond" requires a visitorMessage`,
				};
			}
			break;

		case "internal_note":
			// Internal note needs either an internal note or a message
			if (
				(!decision.internalNote || decision.internalNote.trim().length === 0) &&
				(!decision.message || decision.message.trim().length === 0) &&
				(!visitorMessage || visitorMessage.trim().length === 0)
			) {
				return {
					valid: false,
					error: `Action "internal_note" requires either internalNote or message content`,
				};
			}
			break;

		case "escalate":
			if (!decision.escalation?.reason) {
				return {
					valid: false,
					error: "Escalation requires a reason",
				};
			}
			// Escalation should have a visitor message (either in escalation or top-level)
			if (!(decision.escalation?.visitorMessage || visitorMessage)) {
				console.warn(
					"[ai-agent] Escalation without visitor message - using default"
				);
			}
			break;

		case "resolve":
			// Resolve SHOULD have a visitor message (warn if missing)
			if (!visitorMessage || visitorMessage.trim().length === 0) {
				console.warn(
					"[ai-agent] Resolve action without visitor message - user won't receive explanation"
				);
			}
			break;

		case "skip":
			// Skip SHOULD have a visitor message to avoid going silent (warn if missing)
			if (!visitorMessage || visitorMessage.trim().length === 0) {
				console.warn(
					"[ai-agent] Skip action without visitor message - going silent"
				);
			}
			break;

		case "mark_spam":
			// Spam typically doesn't need a visitor message
			break;

		default:
			return {
				valid: false,
				error: `Unknown action: ${decision.action}`,
			};
	}

	return { valid: true };
}
