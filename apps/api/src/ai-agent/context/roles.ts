/**
 * Role Attribution
 *
 * Determines who sent a message in the conversation.
 * This is critical for the AI to understand the conversation dynamics.
 */

export type SenderType = "visitor" | "human_agent" | "ai_agent";

type TimelineItem = {
	visitorId?: string | null;
	userId?: string | null;
	aiAgentId?: string | null;
	user?: {
		id: string;
		name: string | null;
	} | null;
	visitor?: {
		id: string;
		contact?: {
			name: string | null;
		} | null;
	} | null;
	aiAgent?: {
		id: string;
		name: string;
	} | null;
};

type SenderInfo = {
	type: SenderType;
	id: string | null;
	name: string | null;
};

/**
 * Get sender type and details from a timeline item
 */
export function getSenderType(item: TimelineItem): SenderInfo {
	if (item.visitorId) {
		return {
			type: "visitor",
			id: item.visitorId,
			name: item.visitor?.contact?.name ?? null,
		};
	}

	if (item.userId) {
		return {
			type: "human_agent",
			id: item.userId,
			name: item.user?.name ?? null,
		};
	}

	if (item.aiAgentId) {
		return {
			type: "ai_agent",
			id: item.aiAgentId,
			name: item.aiAgent?.name ?? null,
		};
	}

	// Fallback - should not happen
	return {
		type: "visitor",
		id: null,
		name: null,
	};
}
