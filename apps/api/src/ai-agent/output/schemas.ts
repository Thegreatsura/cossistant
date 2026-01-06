/**
 * AI Decision Schema
 *
 * Defines the structured output format for AI agent decisions.
 * The AI must return a decision in this format, not free-form text.
 */

import { z } from "zod";

/**
 * Escalation details when the AI decides to escalate
 */
export const escalationSchema = z.object({
	/** Reason for escalation (shown to human agents) */
	reason: z.string().describe("Brief reason for escalating to a human agent"),
	/** Specific user to assign to (optional) */
	assignToUserId: z
		.string()
		.optional()
		.describe("User ID to assign the conversation to"),
	/** Urgency level */
	urgency: z
		.enum(["normal", "high", "urgent"])
		.optional()
		.describe("How urgently human attention is needed"),
});

/**
 * Side effects that can happen alongside the primary action
 */
export const sideEffectsSchema = z.object({
	/** Set conversation priority */
	setPriority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.describe("Set the conversation priority"),
	/** Add to views/categories */
	addToViews: z
		.array(z.string())
		.optional()
		.describe("View IDs to add the conversation to"),
	/** Request participants to help */
	requestParticipants: z
		.array(z.string())
		.optional()
		.describe("User IDs to request as participants"),
});

/**
 * The main AI decision schema
 *
 * The AI returns a structured decision that determines what action to take.
 * This prevents the AI from responding when it shouldn't.
 */
export const aiDecisionSchema = z.object({
	/** The primary action to take */
	action: z
		.enum([
			"respond", // Send a visible message to the visitor
			"internal_note", // Add a private note for the team
			"escalate", // Escalate to a human agent
			"resolve", // Mark the conversation as resolved
			"mark_spam", // Mark the conversation as spam
			"skip", // Take no action
		])
		.describe("The primary action to take"),

	/** Message content for respond or internal_note actions */
	message: z
		.string()
		.optional()
		.describe("Message to send (for respond or internal_note actions)"),

	/** Escalation details (required if action is escalate) */
	escalation: escalationSchema
		.optional()
		.describe("Escalation details (required if action is escalate)"),

	/** Side effects to execute alongside the primary action */
	sideEffects: sideEffectsSchema
		.optional()
		.describe("Additional actions to take alongside the primary action"),

	/** AI's reasoning for this decision (for debugging/audit) */
	reasoning: z
		.string()
		.describe("Brief explanation of why this action was chosen"),

	/** Confidence in the decision (0-1) */
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe("How confident the AI is in this decision (0 to 1)"),
});

export type AiDecision = z.infer<typeof aiDecisionSchema>;
export type Escalation = z.infer<typeof escalationSchema>;
export type SideEffects = z.infer<typeof sideEffectsSchema>;
