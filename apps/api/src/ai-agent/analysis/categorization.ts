/**
 * Auto-Categorization
 *
 * Automatically categorizes conversations into views.
 * Views can have prompts that describe what conversations belong in them.
 */

import type { Database } from "@api/db";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { categorize } from "../actions/categorize";

type AutoCategorizeParams = {
	db: Database;
	conversation: ConversationSelect;
	aiAgentId: string;
};

/**
 * Automatically categorize conversation into views
 *
 * TODO: Implement actual auto-categorization using LLM
 * For now, this is a placeholder that doesn't categorize
 */
export async function autoCategorize(
	params: AutoCategorizeParams
): Promise<void> {
	const { db, conversation, aiAgentId } = params;

	// TODO: Implement actual auto-categorization
	// This would:
	// 1. Get views with prompts for this website
	// 2. Get recent messages from conversation
	// 3. Call LLM to match conversation to views
	// 4. Add conversation to matching views

	// Placeholder - don't categorize for now
	console.log(
		`[ai-agent:analysis] Auto-categorization placeholder for conversation ${conversation.id}`
	);
}
