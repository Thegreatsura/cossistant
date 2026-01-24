/**
 * Default Behavior Settings
 *
 * Provides sensible defaults for AI agent behavior.
 */

import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { AiAgentBehaviorSettings } from "./types";

/**
 * Default behavior settings for new AI agents
 *
 * Simplified for MVP - AI responds as fast as possible and decides
 * when to respond based on context, not configuration.
 */
export function getDefaultBehaviorSettings(): AiAgentBehaviorSettings {
	return {
		// Capability toggles
		canResolve: true,
		canMarkSpam: true,
		canAssign: true,
		canSetPriority: true,
		canCategorize: true,
		canEscalate: true,

		// Escalation config
		defaultEscalationUserId: null,

		// Background analysis - all enabled by default
		autoAnalyzeSentiment: true,
		autoGenerateTitle: true,
		autoCategorize: false, // Disabled by default - needs view setup first
	};
}

/**
 * Get behavior settings for an AI agent
 *
 * Merges stored settings with defaults for any missing values.
 */
export function getBehaviorSettings(
	aiAgent: AiAgentSelect
): AiAgentBehaviorSettings {
	const defaults = getDefaultBehaviorSettings();
	const stored = aiAgent.behaviorSettings;

	if (!stored) {
		return defaults;
	}

	// Merge stored with defaults
	return {
		...defaults,
		...stored,
	};
}
