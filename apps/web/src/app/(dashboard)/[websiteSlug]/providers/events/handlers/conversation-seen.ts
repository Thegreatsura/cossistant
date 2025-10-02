import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationHeader } from "@/data/conversation-header-cache";
import { updateConversationHeaderInCache } from "@/data/conversation-header-cache";
import type { DashboardRealtimeContext } from "../types";

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
		Boolean(event.payload.visitorId) &&
		event.payload.visitorId === headersVisitorId
	);
}

type UpdateResult = {
	header: ConversationHeader;
	changed: boolean;
};

function maybeUpdateVisitorLastSeen(
	header: ConversationHeader,
	event: ConversationSeenEvent,
	lastSeenAtTime: number
): UpdateResult {
	if (!shouldUpdateVisitorTimestamp(event, header.visitorId)) {
		return { header, changed: false };
	}

	const currentLastSeen = header.visitor.lastSeenAt?.getTime?.();

	if (currentLastSeen === lastSeenAtTime) {
		return { header, changed: false };
	}

	const nextDate = new Date(lastSeenAtTime);

	return {
		header: {
			...header,
			visitor: {
				...header.visitor,
				lastSeenAt: nextDate,
			},
		},
		changed: true,
	};
}

function maybeUpdateCurrentUserLastSeen(
	header: ConversationHeader,
	event: ConversationSeenEvent,
	currentUserId: string | null | undefined,
	lastSeenAtTime: number
): UpdateResult {
	if (!(event.payload.userId && currentUserId)) {
		return { header, changed: false };
	}

	if (event.payload.userId !== currentUserId) {
		return { header, changed: false };
	}

	const currentLastSeen = header.lastSeenAt?.getTime?.();

	if (currentLastSeen === lastSeenAtTime) {
		return { header, changed: false };
	}

	const nextDate = new Date(lastSeenAtTime);

	return {
		header: {
			...header,
			lastSeenAt: nextDate,
		},
		changed: true,
	};
}

type SeenEntry = ConversationHeader["seenData"][number];

function buildActorPredicates(event: ConversationSeenEvent) {
	const predicates: ((seen: SeenEntry) => boolean)[] = [];

	if (event.payload.userId) {
		predicates.push((seen) => seen.userId === event.payload.userId);
	}

	if (event.payload.visitorId) {
		predicates.push((seen) => seen.visitorId === event.payload.visitorId);
	}

	if (event.payload.aiAgentId) {
		predicates.push((seen) => seen.aiAgentId === event.payload.aiAgentId);
	}

	return predicates;
}

function maybeUpdateSeenEntries(
	header: ConversationHeader,
	event: ConversationSeenEvent,
	lastSeenAtTime: number
): UpdateResult {
	const predicates = buildActorPredicates(event);

	if (predicates.length === 0 || header.seenData.length === 0) {
		return { header, changed: false };
	}

	let didChange = false;

	const nextDate = new Date(lastSeenAtTime);

	const nextSeenData = header.seenData.map((seen) => {
		const matchesActor = predicates.some((predicate) => predicate(seen));

		if (!matchesActor) {
			return seen;
		}

		if (seen.lastSeenAt.getTime() === lastSeenAtTime) {
			return seen;
		}

		didChange = true;

		return {
			...seen,
			lastSeenAt: nextDate,
			updatedAt: nextDate,
		};
	});

	if (!didChange) {
		return { header, changed: false };
	}

	return {
		header: {
			...header,
			seenData: nextSeenData,
		},
		changed: true,
	};
}

export function handleConversationSeen({
	event,
	context,
}: {
	event: ConversationSeenEvent;
	context: DashboardRealtimeContext;
}) {
	if (event.websiteId !== context.website.id) {
		return;
	}

	const lastSeenAt = new Date(event.payload.lastSeenAt);
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
			event.payload.conversationId,
			(header) => {
				const visitorUpdate = maybeUpdateVisitorLastSeen(
					header,
					event,
					lastSeenAtTime
				);
				const userUpdate = maybeUpdateCurrentUserLastSeen(
					visitorUpdate.header,
					event,
					context.userId,
					lastSeenAtTime
				);
				const seenEntriesUpdate = maybeUpdateSeenEntries(
					userUpdate.header,
					event,
					lastSeenAtTime
				);

				if (
					visitorUpdate.changed ||
					userUpdate.changed ||
					seenEntriesUpdate.changed
				) {
					return seenEntriesUpdate.header;
				}

				return header;
			}
		);
	}
}
