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

	// Return a safe fallback
	return {
		action: "skip",
		reasoning: "Failed to parse AI decision, skipping for safety",
		confidence: 0,
	};
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
	switch (decision.action) {
		case "respond":
		case "internal_note":
			if (!decision.message || decision.message.trim().length === 0) {
				return {
					valid: false,
					error: `Action "${decision.action}" requires a message`,
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
			break;

		case "resolve":
		case "mark_spam":
		case "skip":
			// No additional requirements
			break;

		default:
			return {
				valid: false,
				error: `Unknown action: ${decision.action}`,
			};
	}

	return { valid: true };
}
