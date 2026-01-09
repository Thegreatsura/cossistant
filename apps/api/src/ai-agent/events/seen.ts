/**
 * Seen Events
 *
 * Emits seen/read events for the AI agent.
 */

import type { Database } from "@api/db";
import { markConversationAsSeen } from "@api/db/mutations/conversation";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { emitConversationSeenEvent } from "@api/utils/conversation-realtime";

type SeenParams = {
	db: Database;
	conversation: ConversationSelect;
	aiAgentId: string;
};

/**
 * Mark conversation as seen by AI agent and emit event
 */
export async function emitSeen(params: SeenParams): Promise<void> {
	const { db, conversation, aiAgentId } = params;

	const actor = { type: "ai_agent" as const, aiAgentId };

	const lastSeenAt = await markConversationAsSeen(db, {
		conversation,
		actor,
	});

	await emitConversationSeenEvent({
		conversation,
		actor,
		lastSeenAt,
	});
}
