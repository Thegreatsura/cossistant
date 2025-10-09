import { applyConversationSeenEvent } from "@cossistant/react/realtime/seen-store";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationHeader } from "@/data/conversation-header-cache";
import type { DashboardRealtimeContext } from "../types";

type ConversationSeenEvent = RealtimeEvent<"CONVERSATION_SEEN">;

// Debouncing mechanism to prevent animation conflicts
// Store pending updates by conversationId
const pendingSeenUpdates = new Map<
	string,
	{
		event: ConversationSeenEvent;
		context: DashboardRealtimeContext;
		timeoutId: NodeJS.Timeout;
	}
>();

const SEEN_UPDATE_DELAY = 2000; // 500ms delay to let message animations settle

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

	const currentLastSeen = header.visitor.lastSeenAt
		? new Date(header.visitor.lastSeenAt).getTime()
		: null;

	if (currentLastSeen === lastSeenAtTime) {
		return { header, changed: false };
	}

	const nextDate = new Date(lastSeenAtTime).toISOString();

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

	const currentLastSeen = header.lastSeenAt
		? new Date(header.lastSeenAt).getTime()
		: null;

	if (currentLastSeen === lastSeenAtTime) {
		return { header, changed: false };
	}

	const nextDate = new Date(lastSeenAtTime).toISOString();

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

	if (predicates.length === 0) {
		return { header, changed: false };
	}

	const nextDate = new Date(lastSeenAtTime).toISOString();

	// Check if an entry exists for this actor
	const existingEntryIndex = header.seenData.findIndex((seen) =>
		predicates.some((predicate) => predicate(seen))
	);

	// If no entry exists, create a new one
	if (existingEntryIndex === -1) {
		const newEntry: ConversationHeader["seenData"][number] = {
			id: `${header.id}-${event.payload.userId || event.payload.visitorId || event.payload.aiAgentId}`,
			conversationId: header.id,
			userId: event.payload.userId || null,
			visitorId: event.payload.visitorId || null,
			aiAgentId: event.payload.aiAgentId || null,
			lastSeenAt: nextDate,
			createdAt: nextDate,
			updatedAt: nextDate,
			deletedAt: null,
		};

		return {
			header: {
				...header,
				seenData: [...header.seenData, newEntry],
			},
			changed: true,
		};
	}

	// Update existing entry
	let didChange = false;

	const nextSeenData = header.seenData.map((seen) => {
		const matchesActor = predicates.some((predicate) => predicate(seen));

		if (!matchesActor) {
			return seen;
		}

		if (new Date(seen.lastSeenAt).getTime() === lastSeenAtTime) {
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

function applySeenUpdate(
	event: ConversationSeenEvent,
	context: DashboardRealtimeContext
) {
	const lastSeenAt = new Date(event.payload.lastSeenAt);
	const lastSeenAtTime = lastSeenAt.getTime();

	const existingHeader =
		context.queryNormalizer.getObjectById<ConversationHeader>(
			event.payload.conversationId
		);

	if (!existingHeader) {
		return;
	}

	const visitorUpdate = maybeUpdateVisitorLastSeen(
		existingHeader,
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
		context.queryNormalizer.setNormalizedData(seenEntriesUpdate.header);
	}
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

	const conversationId = event.payload.conversationId;

	// Apply to seen store immediately for reactive updates
	applyConversationSeenEvent(event);

	// Clear any existing pending update for this conversation
	const existing = pendingSeenUpdates.get(conversationId);
	if (existing) {
		clearTimeout(existing.timeoutId);
	}

	// Schedule the conversation header cache update after a delay to prevent animation conflicts
	const timeoutId = setTimeout(() => {
		applySeenUpdate(event, context);
		pendingSeenUpdates.delete(conversationId);
	}, SEEN_UPDATE_DELAY);

	// Store the pending update
	pendingSeenUpdates.set(conversationId, {
		event,
		context,
		timeoutId,
	});
}
