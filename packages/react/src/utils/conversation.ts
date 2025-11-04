import { type Conversation, ConversationStatus } from "@cossistant/types";

const HIDDEN_STATUSES = new Set<ConversationStatus | "closed">([
	ConversationStatus.RESOLVED,
	"closed",
]);

function hasDisplayableTitle(conversation: Conversation): boolean {
	const title = conversation.title?.trim();

	return Boolean(title && title.length > 0);
}

export function shouldDisplayConversation(conversation: Conversation): boolean {
	if (!hasDisplayableTitle(conversation)) {
		return false;
	}

	if (conversation.deletedAt) {
		return false;
	}

	if (HIDDEN_STATUSES.has(conversation.status)) {
		return false;
	}

	return true;
}
