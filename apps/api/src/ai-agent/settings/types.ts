/**
 * AI Agent Behavior Settings
 *
 * These settings control how the AI agent behaves in conversations.
 * They are stored in the behaviorSettings column of the ai_agent table.
 *
 * Simplified for MVP - the AI decides when to respond based on context,
 * not configuration. Removed: responseMode, responseDelayMs, pauseOnHumanReply,
 * pauseDurationMinutes.
 */

/**
 * Behavior settings for an AI agent
 */
export type AiAgentBehaviorSettings = {
	// Capability toggles
	/** Can the AI resolve conversations */
	canResolve: boolean;
	/** Can the AI mark conversations as spam */
	canMarkSpam: boolean;
	/** Can the AI assign conversations to team members */
	canAssign: boolean;
	/** Can the AI change conversation priority */
	canSetPriority: boolean;
	/** Can the AI add conversations to views/categories */
	canCategorize: boolean;
	/** Can the AI escalate to human agents */
	canEscalate: boolean;

	// Escalation config
	/** Default user to assign when escalating (null = no default) */
	defaultEscalationUserId: string | null;

	// Visitor identification
	/** How aggressively the AI should ask for visitor contact info */
	visitorContactPolicy: "only_if_needed" | "ask_early" | "ask_after_time";

	// Background analysis (runs silently, creates private events)
	/** Automatically analyze and set conversation sentiment */
	autoAnalyzeSentiment: boolean;
	/** Automatically generate conversation titles */
	autoGenerateTitle: boolean;
	/** Automatically categorize into views based on content */
	autoCategorize: boolean;
};
