import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { create } from "zustand";

export type SeenActorType = "visitor" | "user" | "ai_agent";

type SeenEntry = {
	actorType: SeenActorType;
	actorId: string;
	lastSeenAt: Date;
};

type ConversationSeenState = Record<string, SeenEntry>;

type SeenState = {
	conversations: Record<string, ConversationSeenState>;
};

type SeenActions = {
	upsert: (options: {
		conversationId: string;
		actorType: SeenActorType;
		actorId: string;
		lastSeenAt: Date;
	}) => void;
	hydrate: (conversationId: string, entries: ConversationSeen[]) => void;
	clear: (conversationId: string) => void;
};

function makeKey(
	conversationId: string,
	actorType: SeenActorType,
	actorId: string
) {
	return `${conversationId}:${actorType}:${actorId}`;
}

export const useSeenStore = create<SeenState & SeenActions>((set) => ({
	conversations: {},
	upsert: ({ conversationId, actorType, actorId, lastSeenAt }) => {
		set((state) => {
			const existingConversation = state.conversations[conversationId] ?? {};
			const key = makeKey(conversationId, actorType, actorId);
			const previous = existingConversation[key];

			if (previous && previous.lastSeenAt.getTime() >= lastSeenAt.getTime()) {
				return state;
			}

			return {
				conversations: {
					...state.conversations,
					[conversationId]: {
						...existingConversation,
						[key]: {
							actorType,
							actorId,
							lastSeenAt,
						},
					},
				},
			} satisfies SeenState;
		});
	},
	hydrate: (conversationId, entries) => {
		set((state) => {
			if (entries.length === 0) {
				return state;
			}

			const nextEntries: ConversationSeenState = {};

			for (const entry of entries) {
				const actorId = entry.userId || entry.visitorId || entry.aiAgentId;
				let actorType: SeenActorType | null = null;

				if (entry.userId) {
					actorType = "user";
				} else if (entry.visitorId) {
					actorType = "visitor";
				} else if (entry.aiAgentId) {
					actorType = "ai_agent";
				}

				if (!(actorId && actorType)) {
					continue;
				}

				const key = makeKey(conversationId, actorType, actorId);
				nextEntries[key] = {
					actorType,
					actorId,
					lastSeenAt: entry.lastSeenAt,
				};
			}

			if (Object.keys(nextEntries).length === 0) {
				return state;
			}

			return {
				conversations: {
					...state.conversations,
					[conversationId]: nextEntries,
				},
			} satisfies SeenState;
		});
	},
	clear: (conversationId) => {
		set((state) => {
			if (!(conversationId in state.conversations)) {
				return state;
			}

			const nextConversations = { ...state.conversations };
			delete nextConversations[conversationId];
			return { conversations: nextConversations } satisfies SeenState;
		});
	},
}));

export function hydrateConversationSeen(
	conversationId: string,
	entries: ConversationSeen[]
) {
	useSeenStore.getState().hydrate(conversationId, entries);
}

export function upsertConversationSeen(options: {
	conversationId: string;
	actorType: SeenActorType;
	actorId: string;
	lastSeenAt: Date;
}) {
	useSeenStore.getState().upsert(options);
}

export function applyConversationSeenEvent(
	event: RealtimeEvent<"CONVERSATION_SEEN">,
	options: {
		ignoreVisitorId?: string | null;
		ignoreUserId?: string | null;
		ignoreAiAgentId?: string | null;
	} = {}
) {
	const { payload } = event;
	let actorType: SeenActorType | null = null;
	let actorId: string | null = null;

	if (payload.userId) {
		actorType = "user";
		actorId = payload.userId;
	} else if (payload.visitorId) {
		actorType = "visitor";
		actorId = payload.visitorId;
	} else if (payload.aiAgentId) {
		actorType = "ai_agent";
		actorId = payload.aiAgentId;
	}

	if (!(actorType && actorId)) {
		return;
	}

	if (
		(actorType === "visitor" &&
			payload.visitorId &&
			options.ignoreVisitorId &&
			payload.visitorId === options.ignoreVisitorId) ||
		(actorType === "user" &&
			payload.userId &&
			options.ignoreUserId &&
			payload.userId === options.ignoreUserId) ||
		(actorType === "ai_agent" &&
			payload.aiAgentId &&
			options.ignoreAiAgentId &&
			payload.aiAgentId === options.ignoreAiAgentId)
	) {
		return;
	}

	const lastSeenAt = new Date(payload.lastSeenAt);

	upsertConversationSeen({
		conversationId: payload.conversationId,
		actorType,
		actorId,
		lastSeenAt,
	});
}
