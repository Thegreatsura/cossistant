/**
 * Conversation Meta Context
 *
 * Provides conversation statistics for AI context.
 */

import type { ConversationSelect } from "@api/db/schema/conversation";
import type { RoleAwareMessage } from "./conversation";

/**
 * Conversation metadata for AI context
 */
export type ConversationMeta = {
	messageCount: number;
	visitorMessageCount: number;
	startedAgo: string;
	lastVisitorActivity: string | null;
	isFirstMessage: boolean;
};

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return days === 1 ? "1 day ago" : `${days} days ago`;
	}
	if (hours > 0) {
		return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
	}
	if (minutes > 0) {
		return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
	}
	return "just now";
}

/**
 * Get conversation metadata for AI context
 */
export function getConversationMeta(
	conversation: ConversationSelect,
	messages: RoleAwareMessage[]
): ConversationMeta {
	const now = new Date();
	const startedAt = new Date(conversation.createdAt);
	const startedAgo = formatDuration(now.getTime() - startedAt.getTime());

	// Count visitor messages
	const visitorMessages = messages.filter((m) => m.senderType === "visitor");
	const visitorMessageCount = visitorMessages.length;

	// Find last visitor message time
	let lastVisitorActivity: string | null = null;
	if (visitorMessages.length > 0) {
		const lastVisitorMessage = visitorMessages[visitorMessages.length - 1];
		if (lastVisitorMessage?.timestamp) {
			const lastTime = new Date(lastVisitorMessage.timestamp);
			lastVisitorActivity = formatDuration(now.getTime() - lastTime.getTime());
		}
	}

	return {
		messageCount: messages.length,
		visitorMessageCount,
		startedAgo,
		lastVisitorActivity,
		isFirstMessage: visitorMessageCount <= 1,
	};
}

/**
 * Format conversation meta for inclusion in prompt
 */
export function formatConversationMetaForPrompt(
	meta: ConversationMeta
): string {
	if (meta.isFirstMessage) {
		return "This is the **start of the conversation**.";
	}

	const parts = [`Conversation started **${meta.startedAgo}**`];
	parts.push(`with **${meta.messageCount} messages** so far.`);

	if (meta.lastVisitorActivity) {
		parts.push(`Last visitor message: **${meta.lastVisitorActivity}**.`);
	}

	return parts.join(" ");
}
