/**
 * Visitor Context
 *
 * Provides information about the visitor for personalization.
 */

import type { Database } from "@api/db";
import { getCompleteVisitorWithContact } from "@api/db/queries/visitor";

/**
 * Visitor context for AI personalization
 */
export type VisitorContext = {
	name: string | null;
	email: string | null;
	isIdentified: boolean;
	country: string | null;
	city: string | null;
	language: string | null;
	timezone: string | null;
	browser: string | null;
	device: string | null;
	metadata: Record<string, unknown> | null;
};

/**
 * Get visitor context for personalization
 */
export async function getVisitorContext(
	db: Database,
	visitorId: string
): Promise<VisitorContext | null> {
	const visitorWithContact = await getCompleteVisitorWithContact(db, {
		visitorId,
	});

	if (!visitorWithContact) {
		return null;
	}

	return {
		name:
			visitorWithContact.contact?.name ??
			visitorWithContact.contact?.email?.split("@")[0] ??
			null,
		email: visitorWithContact.contact?.email ?? null,
		isIdentified: Boolean(visitorWithContact.contact),
		country: visitorWithContact.country ?? null,
		city: visitorWithContact.city ?? null,
		language: visitorWithContact.language ?? null,
		timezone: visitorWithContact.timezone ?? null,
		browser: visitorWithContact.browser ?? null,
		device: visitorWithContact.device ?? null,
		metadata:
			(visitorWithContact.contact?.metadata as Record<string, unknown>) ?? null,
	};
}

/**
 * Format visitor context as a prompt suffix
 */
export function formatVisitorContextForPrompt(
	context: VisitorContext | null
): string {
	if (!context) {
		return "";
	}

	const parts: string[] = [];

	if (context.name) {
		parts.push(`- Name: ${context.name}`);
	}
	if (context.email) {
		parts.push(`- Email: ${context.email}`);
	}
	if (context.country || context.city) {
		const location = [context.city, context.country].filter(Boolean).join(", ");
		if (location) {
			parts.push(`- Location: ${location}`);
		}
	}
	if (context.language) {
		parts.push(`- Language: ${context.language}`);
	}
	if (context.timezone) {
		parts.push(`- Timezone: ${context.timezone}`);
	}
	if (context.browser) {
		parts.push(`- Browser: ${context.browser}`);
	}
	if (context.device) {
		parts.push(`- Device: ${context.device}`);
	}

	if (parts.length === 0) {
		return "";
	}

	return `\n\n## Current Visitor Information\n${parts.join("\n")}`;
}
