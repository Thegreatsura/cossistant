import { updateConversationHeaderInCache } from "@/data/conversation-header-cache";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { RealtimeEventHandler } from "../types";

type ConversationSeenEvent = RealtimeEvent<"CONVERSATION_SEEN">;

type ConversationHeadersQueryInput = {
	websiteSlug?: string;
};

type QueryKeyInput = {
	input?: ConversationHeadersQueryInput;
};

function extractHeadersQueryInput(
	queryKey: readonly unknown[]
): ConversationHeadersQueryInput | null {
	if (queryKey.length < 2) {
		return null;
	}

	const maybeInput = queryKey[1];
	if (!maybeInput || typeof maybeInput !== "object") {
		return null;
	}

	const input = (maybeInput as QueryKeyInput).input;
	if (!input || typeof input !== "object") {
		return null;
	}

	return input;
}

function shouldUpdateVisitorTimestamp(
	event: ConversationSeenEvent,
	headersVisitorId: string
) {
	return (
		event.data.actorType === "visitor" &&
		event.data.conversationVisitorId === headersVisitorId
	);
}

export const handleConversationSeen: RealtimeEventHandler<"CONVERSATION_SEEN"> = (
	{ event, context }
) => {
	if (event.data.websiteId !== context.website.id) {
		return;
	}

	const lastSeenAt = new Date(event.data.lastSeenAt);
	const lastSeenAtTime = lastSeenAt.getTime();

	const queries = context.queryClient
		.getQueryCache()
		.findAll({ queryKey: [["conversation", "listConversationsHeaders"]] });

	for (const query of queries) {
		const queryKey = query.queryKey as readonly unknown[];
		const input = extractHeadersQueryInput(queryKey);

		if (!input) {
			continue;
		}

		if (input.websiteSlug && input.websiteSlug !== context.website.slug) {
			continue;
		}

		updateConversationHeaderInCache(
			context.queryClient,
			queryKey,
			event.data.conversationId,
			(header) => {
				let hasChanged = false;
				let nextHeader = header;

				if (
					shouldUpdateVisitorTimestamp(event, header.visitorId) &&
					header.visitor.lastSeenAt?.getTime?.() !== lastSeenAtTime
				) {
					nextHeader = {
						...nextHeader,
						visitor: {
							...nextHeader.visitor,
							lastSeenAt: new Date(lastSeenAtTime),
						},
					};
					hasChanged = true;
				}

				if (
					event.data.userId &&
					context.userId &&
					event.data.userId === context.userId &&
					nextHeader.lastSeenAt?.getTime?.() !== lastSeenAtTime
				) {
					nextHeader = {
						...nextHeader,
						lastSeenAt: new Date(lastSeenAtTime),
					};
					hasChanged = true;
				}

				return hasChanged ? nextHeader : header;
			}
		);
	}
};
