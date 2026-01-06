/**
 * Typing Events
 *
 * Emits typing indicator events for the AI agent.
 */

import type { ConversationSelect } from "@api/db/schema/conversation";
import { emitConversationTypingEvent } from "@api/utils/conversation-realtime";

type TypingParams = {
	conversation: ConversationSelect;
	aiAgentId: string;
};

/**
 * Emit typing start event
 */
export async function emitTypingStart(params: TypingParams): Promise<void> {
	await emitConversationTypingEvent({
		conversation: params.conversation,
		actor: { type: "ai_agent", aiAgentId: params.aiAgentId },
		isTyping: true,
	});
}

/**
 * Emit typing stop event
 */
export async function emitTypingStop(params: TypingParams): Promise<void> {
	await emitConversationTypingEvent({
		conversation: params.conversation,
		actor: { type: "ai_agent", aiAgentId: params.aiAgentId },
		isTyping: false,
	});
}
