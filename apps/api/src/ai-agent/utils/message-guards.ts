import type { Database } from "@api/db";
import {
	getLatestPublicAiMessage,
	getLatestPublicVisitorMessageId,
} from "@api/db/queries/conversation";

function normalizeMessageForDedup(text: string): string {
	return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function hasNewerVisitorMessageSinceStart(params: {
	db: Database;
	conversationId: string;
	organizationId: string;
	latestVisitorMessageIdAtStart: string | null | undefined;
}): Promise<{ hasNewer: boolean; latestVisitorMessageId: string | null }> {
	const latestVisitorMessageId = await getLatestPublicVisitorMessageId(
		params.db,
		{
			conversationId: params.conversationId,
			organizationId: params.organizationId,
		}
	);

	if (typeof params.latestVisitorMessageIdAtStart === "undefined") {
		return { hasNewer: false, latestVisitorMessageId };
	}

	return {
		hasNewer: latestVisitorMessageId !== params.latestVisitorMessageIdAtStart,
		latestVisitorMessageId,
	};
}

export async function isDuplicatePublicAiMessage(params: {
	db: Database;
	conversationId: string;
	organizationId: string;
	messageText: string;
}): Promise<{ duplicate: boolean; latestMessageId?: string }> {
	const latest = await getLatestPublicAiMessage(params.db, {
		conversationId: params.conversationId,
		organizationId: params.organizationId,
	});

	if (!latest?.text) {
		return { duplicate: false };
	}

	const normalizedLatest = normalizeMessageForDedup(latest.text);
	if (!normalizedLatest) {
		return { duplicate: false };
	}

	const normalizedIncoming = normalizeMessageForDedup(params.messageText);
	if (!normalizedIncoming) {
		return { duplicate: false };
	}

	return {
		duplicate: normalizedLatest === normalizedIncoming,
		latestMessageId: latest.id,
	};
}
