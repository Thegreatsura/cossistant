/**
 * AI Agent Module
 *
 * This module contains all AI agent logic for the Cossistant support system.
 * The AI agent is an autonomous actor that can respond to visitors, analyze
 * conversations, escalate to humans, and perform various support actions.
 *
 * See AI-README.md for architecture documentation.
 */

// Context
export {
	buildConversationHistory,
	type ConversationState,
	getConversationState,
	getVisitorContext,
	type RoleAwareMessage,
	type VisitorContext,
} from "./context";
export type { AiDecision } from "./output";
// Output schemas
export { aiDecisionSchema } from "./output";
export type { AiAgentPipelineInput, AiAgentPipelineResult } from "./pipeline";
// Pipeline
export { runAiAgentPipeline } from "./pipeline";
// Settings
export type { AiAgentBehaviorSettings } from "./settings";
export {
	getDefaultBehaviorSettings,
	validateBehaviorSettings,
} from "./settings";
