import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { create } from "zustand";

export type TypingActorType = "visitor" | "user" | "ai_agent";

export type TypingEntry = {
actorType: TypingActorType;
actorId: string;
preview: string | null;
updatedAt: number;
};

type ConversationTypingState = Record<string, TypingEntry>;

type TypingState = {
conversations: Record<string, ConversationTypingState>;
};

type TypingActions = {
setTyping: (options: {
conversationId: string;
actorType: TypingActorType;
actorId: string;
isTyping: boolean;
preview?: string | null;
ttlMs?: number;
}) => void;
removeTyping: (options: {
conversationId: string;
actorType: TypingActorType;
actorId: string;
}) => void;
clearConversation: (conversationId: string) => void;
};

const DEFAULT_TTL_MS = 6000;

const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

function makeKey(conversationId: string, actorType: TypingActorType, actorId: string) {
return `${conversationId}:${actorType}:${actorId}`;
}

function clearTimer(key: string) {
const timeout = cleanupTimers.get(key);
if (timeout) {
clearTimeout(timeout);
cleanupTimers.delete(key);
}
}

export const useTypingStore = create<TypingState & TypingActions>((set, get) => ({
conversations: {},
setTyping: ({ conversationId, actorType, actorId, isTyping, preview = null, ttlMs }) => {
const key = makeKey(conversationId, actorType, actorId);

set((state) => {
const existingConversation = state.conversations[conversationId];

if (!isTyping) {
if (!existingConversation || !(key in existingConversation)) {
return state;
}

const { [key]: _removed, ...rest } = existingConversation;
const nextConversations = { ...state.conversations };

if (Object.keys(rest).length === 0) {
delete nextConversations[conversationId];
} else {
nextConversations[conversationId] = rest;
}

return { conversations: nextConversations } satisfies TypingState;
}

const nextEntry: TypingEntry = {
actorType,
actorId,
preview: preview ?? null,
updatedAt: Date.now(),
};

const nextConversation: ConversationTypingState = {
...(existingConversation ? { ...existingConversation } : {}),
[key]: nextEntry,
};

return {
conversations: {
...state.conversations,
[conversationId]: nextConversation,
},
} satisfies TypingState;
});

if (isTyping) {
const timeoutMs = ttlMs ?? DEFAULT_TTL_MS;
clearTimer(key);
const timeout = setTimeout(() => {
get().removeTyping({ conversationId, actorType, actorId });
}, timeoutMs);
cleanupTimers.set(key, timeout);
} else {
clearTimer(key);
}
},
removeTyping: ({ conversationId, actorType, actorId }) => {
const key = makeKey(conversationId, actorType, actorId);
clearTimer(key);

set((state) => {
const existingConversation = state.conversations[conversationId];
if (!existingConversation || !(key in existingConversation)) {
return state;
}

const { [key]: _removed, ...rest } = existingConversation;
const nextConversations = { ...state.conversations };

if (Object.keys(rest).length === 0) {
delete nextConversations[conversationId];
} else {
nextConversations[conversationId] = rest;
}

return { conversations: nextConversations } satisfies TypingState;
});
},
clearConversation: (conversationId) => {
set((state) => {
if (!(conversationId in state.conversations)) {
return state;
}

const nextConversations = { ...state.conversations };
delete nextConversations[conversationId];
return { conversations: nextConversations } satisfies TypingState;
});
},
}));

export function setTypingState(options: {
conversationId: string;
actorType: TypingActorType;
actorId: string;
isTyping: boolean;
preview?: string | null;
ttlMs?: number;
}) {
useTypingStore.getState().setTyping(options);
}

export function clearTypingState(options: {
conversationId: string;
actorType: TypingActorType;
actorId: string;
}) {
useTypingStore.getState().removeTyping(options);
}

export function applyConversationTypingEvent(
event: RealtimeEvent<"CONVERSATION_TYPING">,
options: {
ignoreVisitorId?: string | null;
ignoreUserId?: string | null;
ignoreAiAgentId?: string | null;
ttlMs?: number;
} = {}
) {
const { payload } = event;
let actorType: TypingActorType | null = null;
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

const preview =
actorType === "visitor" ? payload.visitorPreview ?? null : null;

setTypingState({
conversationId: payload.conversationId,
actorType,
actorId,
isTyping: payload.isTyping,
preview,
ttlMs: options.ttlMs,
});
}

export function clearTypingFromMessage(
event: RealtimeEvent<"MESSAGE_CREATED">
) {
const { message } = event.payload;
let actorType: TypingActorType | null = null;
let actorId: string | null = null;

if (message.userId) {
actorType = "user";
actorId = message.userId;
} else if (message.visitorId) {
actorType = "visitor";
actorId = message.visitorId;
} else if (message.aiAgentId) {
actorType = "ai_agent";
actorId = message.aiAgentId;
}

if (!(actorType && actorId)) {
return;
}

clearTypingState({
conversationId: message.conversationId,
actorType,
actorId,
});
}
