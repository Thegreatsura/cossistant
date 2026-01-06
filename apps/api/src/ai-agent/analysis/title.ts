/**
 * Title Generation
 *
 * Generates a conversation title using AI.
 * Creates a private TITLE_GENERATED event.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { updateTitle } from "../actions/update-title";

type GenerateTitleParams = {
	db: Database;
	conversation: ConversationSelect;
	aiAgentId: string;
};

/**
 * Generate and update conversation title
 *
 * TODO: Implement actual title generation using LLM
 * For now, this is a placeholder that doesn't update title
 */
export async function generateTitle(
	params: GenerateTitleParams
): Promise<void> {
	const { db, conversation, aiAgentId } = params;

	// Skip if title already exists
	if (conversation.title) {
		return;
	}

	// TODO: Implement actual title generation
	// This would:
	// 1. Get first few messages
	// 2. Call LLM to generate a brief title
	// 3. Update conversation with title

	// Placeholder - don't update for now
	console.log(
		`[ai-agent:analysis] Title generation placeholder for conversation ${conversation.id}`
	);
}
