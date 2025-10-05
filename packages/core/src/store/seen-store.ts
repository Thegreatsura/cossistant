import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { createStore, type Store } from "./create-store";

export type SeenActorType = "visitor" | "user" | "ai_agent";

export type SeenEntry = {
        actorType: SeenActorType;
        actorId: string;
        lastSeenAt: Date;
};

export type ConversationSeenState = Record<string, SeenEntry>;

export type SeenState = {
        conversations: Record<string, ConversationSeenState>;
};

const INITIAL_STATE: SeenState = {
        conversations: {},
};

type UpsertSeenOptions = {
        conversationId: string;
        actorType: SeenActorType;
        actorId: string;
        lastSeenAt: Date;
};

function makeKey(
        conversationId: string,
        actorType: SeenActorType,
        actorId: string
): string {
        return `${conversationId}:${actorType}:${actorId}`;
}

function hasSameEntries(
        existing: ConversationSeenState | undefined,
        next: ConversationSeenState
): boolean {
        if (!existing) {
                return false;
        }

        const existingKeys = Object.keys(existing);
        const nextKeys = Object.keys(next);

        if (existingKeys.length !== nextKeys.length) {
                return false;
        }

        for (const key of nextKeys) {
                const previous = existing[key];
                const incoming = next[key];

                if (!previous || !incoming) {
                        return false;
                }

                if (
                        previous.actorType !== incoming.actorType ||
                        previous.actorId !== incoming.actorId ||
                        previous.lastSeenAt.getTime() !== incoming.lastSeenAt.getTime()
                ) {
                        return false;
                }
        }

        return true;
}

export type SeenStore = Store<SeenState> & {
        upsert(options: UpsertSeenOptions): void;
        hydrate(conversationId: string, entries: ConversationSeen[]): void;
        clear(conversationId: string): void;
};

export function createSeenStore(initialState: SeenState = INITIAL_STATE): SeenStore {
        const store = createStore<SeenState>({
                conversations: { ...initialState.conversations },
        });

        return {
                ...store,
                upsert({ conversationId, actorType, actorId, lastSeenAt }) {
                        store.setState((state) => {
                                const existingConversation =
                                        state.conversations[conversationId] ?? {};
                                const key = makeKey(conversationId, actorType, actorId);
                                const previous = existingConversation[key];

                                if (
                                        previous &&
                                        previous.lastSeenAt.getTime() >= lastSeenAt.getTime()
                                ) {
                                        return state;
                                }

                                const nextConversation: ConversationSeenState = {
                                        ...existingConversation,
                                        [key]: {
                                                actorType,
                                                actorId,
                                                lastSeenAt,
                                        },
                                };

                                return {
                                        conversations: {
                                                ...state.conversations,
                                                [conversationId]: nextConversation,
                                        },
                                } satisfies SeenState;
                        });
                },
                hydrate(conversationId, entries) {
                        store.setState((state) => {
                                if (entries.length === 0) {
                                        return state;
                                }

                                const nextEntries: ConversationSeenState = {};

                                for (const entry of entries) {
                                        const actorId =
                                                entry.userId || entry.visitorId || entry.aiAgentId;
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
                                                lastSeenAt: new Date(entry.lastSeenAt),
                                        };
                                }

                                if (Object.keys(nextEntries).length === 0) {
                                        return state;
                                }

                                const existing = state.conversations[conversationId];
                                if (hasSameEntries(existing, nextEntries)) {
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
                clear(conversationId) {
                        store.setState((state) => {
                                if (!(conversationId in state.conversations)) {
                                        return state;
                                }

                                const nextConversations = { ...state.conversations };
                                delete nextConversations[conversationId];

                                return { conversations: nextConversations } satisfies SeenState;
                        });
                },
        } satisfies SeenStore;
}

export function hydrateConversationSeen(
        store: SeenStore,
        conversationId: string,
        entries: ConversationSeen[]
): void {
        store.hydrate(conversationId, entries);
}

export function upsertConversationSeen(
        store: SeenStore,
        options: UpsertSeenOptions
): void {
        store.upsert(options);
}

export function applyConversationSeenEvent(
        store: SeenStore,
        event: RealtimeEvent<"CONVERSATION_SEEN">,
        options: {
                ignoreVisitorId?: string | null;
                ignoreUserId?: string | null;
                ignoreAiAgentId?: string | null;
        } = {}
): void {
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

        upsertConversationSeen(store, {
                conversationId: payload.conversationId,
                actorType,
                actorId,
                lastSeenAt,
        });
}
