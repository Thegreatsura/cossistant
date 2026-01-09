/**
 * Context Module
 *
 * This module provides functions to build context for the AI agent.
 * Context includes conversation history, visitor information, and state.
 */

export {
	buildConversationHistory,
	type RoleAwareMessage,
} from "./conversation";
export { getSenderType, type SenderType } from "./roles";

export { type ConversationState, getConversationState } from "./state";
export { getVisitorContext, type VisitorContext } from "./visitor";
