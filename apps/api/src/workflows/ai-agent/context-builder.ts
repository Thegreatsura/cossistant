import type { Database } from "@api/db";
import { getConversationTimelineItems } from "@api/db/queries/conversation";
import { getCompleteVisitorWithContact } from "@api/db/queries/visitor";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import type { ModelMessage } from "ai";

/**
 * Maximum number of recent messages to include in AI context
 * Helps control token usage and keep context relevant
 */
const MAX_CONTEXT_MESSAGES = 20;

export type ConversationContextData = {
	conversationId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
};

export type VisitorContextInfo = {
	name: string | null;
	email: string | null;
	country: string | null;
	city: string | null;
	language: string | null;
	timezone: string | null;
	browser: string | null;
	device: string | null;
};

/**
 * Build the conversation history as CoreMessages for the AI SDK
 * Maps timeline items to the appropriate role (user/assistant)
 */
export async function buildConversationHistory(
	db: Database,
	data: ConversationContextData
): Promise<ModelMessage[]> {
	const { items } = await getConversationTimelineItems(db, {
		organizationId: data.organizationId,
		conversationId: data.conversationId,
		websiteId: data.websiteId,
		limit: MAX_CONTEXT_MESSAGES,
		// Only include public messages (not internal notes)
		visibility: [TimelineItemVisibility.PUBLIC],
	});

	const messages: ModelMessage[] = [];

	for (const item of items) {
		// Only include message types, skip events
		if (item.type !== ConversationTimelineType.MESSAGE) {
			continue;
		}

		const text = item.text ?? "";
		if (!text.trim()) {
			continue;
		}

		// Determine the role based on who sent the message
		// Visitor messages are "user", team member/AI messages are "assistant"
		if (item.visitorId) {
			messages.push({
				role: "user",
				content: text,
			});
		} else if (item.userId || item.aiAgentId) {
			messages.push({
				role: "assistant",
				content: text,
			});
		}
	}

	return messages;
}

/**
 * Get visitor context information for the AI system prompt
 */
export async function getVisitorContextInfo(
	db: Database,
	visitorId: string
): Promise<VisitorContextInfo | null> {
	const visitorWithContact = await getCompleteVisitorWithContact(db, {
		visitorId,
	});

	if (!visitorWithContact) {
		return null;
	}

	return {
		name: visitorWithContact.contact?.name ?? null,
		email: visitorWithContact.contact?.email ?? null,
		country: visitorWithContact.country ?? null,
		city: visitorWithContact.city ?? null,
		language: visitorWithContact.language ?? null,
		timezone: visitorWithContact.timezone ?? null,
		browser: visitorWithContact.browser ?? null,
		device: visitorWithContact.device ?? null,
	};
}

/**
 * Build a system prompt suffix with visitor context
 * This gets appended to the AI agent's base prompt
 */
export function buildVisitorContextPrompt(
	visitorInfo: VisitorContextInfo | null
): string {
	if (!visitorInfo) {
		return "";
	}

	const parts: string[] = [];

	if (visitorInfo.name) {
		parts.push(`- Name: ${visitorInfo.name}`);
	}
	if (visitorInfo.email) {
		parts.push(`- Email: ${visitorInfo.email}`);
	}
	if (visitorInfo.country || visitorInfo.city) {
		const location = [visitorInfo.city, visitorInfo.country]
			.filter(Boolean)
			.join(", ");
		if (location) {
			parts.push(`- Location: ${location}`);
		}
	}
	if (visitorInfo.language) {
		parts.push(`- Language: ${visitorInfo.language}`);
	}
	if (visitorInfo.timezone) {
		parts.push(`- Timezone: ${visitorInfo.timezone}`);
	}
	if (visitorInfo.browser) {
		parts.push(`- Browser: ${visitorInfo.browser}`);
	}
	if (visitorInfo.device) {
		parts.push(`- Device: ${visitorInfo.device}`);
	}

	if (parts.length === 0) {
		return "";
	}

	return `\n\n## Current Visitor Information\n${parts.join("\n")}`;
}
