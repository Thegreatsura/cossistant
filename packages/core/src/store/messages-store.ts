import type { Message, RealtimeEvent } from "@cossistant/types";
import { createStore, type Store } from "./create-store";

type MessageCreatedEvent = RealtimeEvent<"MESSAGE_CREATED">;

export type ConversationMessagesState = {
	messages: Message[];
	hasNextPage: boolean;
	nextCursor?: string;
};

export type MessagesState = {
	conversations: Record<string, ConversationMessagesState>;
};

const INITIAL_STATE: MessagesState = {
	conversations: {},
};

function sortMessages(messages: Message[]): Message[] {
	return [...messages].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime()
	);
}

function isSameMessage(a: Message, b: Message): boolean {
	return (
		a.id === b.id &&
		a.bodyMd === b.bodyMd &&
		a.updatedAt.getTime() === b.updatedAt.getTime() &&
		a.createdAt.getTime() === b.createdAt.getTime()
	);
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
	if (incoming.length === 0) {
		return existing;
	}

	const byId = new Map<string, Message>();
	for (const message of existing) {
		byId.set(message.id, message);
	}

	let changed = false;
	for (const message of incoming) {
		const previous = byId.get(message.id);
		if (!(previous && isSameMessage(previous, message))) {
			changed = true;
		}
		byId.set(message.id, message);
	}

	if (!changed && byId.size === existing.length) {
		let orderStable = true;
		for (const message of existing) {
			if (byId.get(message.id) !== message) {
				orderStable = false;
				break;
			}
		}

		// biome-ignore lint/nursery/noUnnecessaryConditions: false positive
		if (orderStable) {
			return existing;
		}
	}

	return sortMessages(Array.from(byId.values()));
}

function applyPage(
	state: MessagesState,
	conversationId: string,
	page: Pick<
		ConversationMessagesState,
		"messages" | "hasNextPage" | "nextCursor"
	>
): MessagesState {
	const existing = state.conversations[conversationId];
	const mergedMessages = mergeMessages(existing?.messages ?? [], page.messages);

	if (
		existing &&
		existing.messages === mergedMessages &&
		existing.hasNextPage === page.hasNextPage &&
		existing.nextCursor === page.nextCursor
	) {
		return state;
	}

	return {
		...state,
		conversations: {
			...state.conversations,
			[conversationId]: {
				messages: mergedMessages,
				hasNextPage: page.hasNextPage,
				nextCursor: page.nextCursor,
			},
		},
	};
}

function applyMessage(state: MessagesState, message: Message): MessagesState {
	const existing = state.conversations[message.conversationId];
	const mergedMessages = mergeMessages(existing?.messages ?? [], [message]);

	if (existing && existing.messages === mergedMessages) {
		return state;
	}

	return {
		...state,
		conversations: {
			...state.conversations,
			[message.conversationId]: {
				messages: mergedMessages,
				hasNextPage: existing?.hasNextPage ?? false,
				nextCursor: existing?.nextCursor,
			},
		},
	};
}

function removeMessage(
	state: MessagesState,
	conversationId: string,
	messageId: string
): MessagesState {
	const existing = state.conversations[conversationId];
	if (!existing) {
		return state;
	}

	const index = existing.messages.findIndex((item) => item.id === messageId);
	if (index === -1) {
		return state;
	}

	const nextMessages = existing.messages
		.slice(0, index)
		.concat(existing.messages.slice(index + 1));

	const nextConversation: ConversationMessagesState = {
		...existing,
		messages: nextMessages,
	};

	return {
		...state,
		conversations: {
			...state.conversations,
			[conversationId]: nextConversation,
		},
	};
}

function finalizeMessage(
	state: MessagesState,
	conversationId: string,
	optimisticId: string,
	message: Message
): MessagesState {
	const withoutOptimistic = removeMessage(state, conversationId, optimisticId);
	return applyMessage(withoutOptimistic, message);
}

function normalizeRealtimeMessage(event: MessageCreatedEvent): Message {
        const raw = event.payload.message;
        return {
                id: raw.id,
                bodyMd: raw.bodyMd,
		type: raw.type as Message["type"],
		userId: raw.userId,
		aiAgentId: raw.aiAgentId,
		parentMessageId: raw.parentMessageId ?? null,
		modelUsed: raw.modelUsed ?? null,
		visitorId: raw.visitorId,
                conversationId: raw.conversationId,
                createdAt: new Date(raw.createdAt),
                updatedAt: new Date(raw.updatedAt),
                deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : null,
                visibility: raw.visibility as Message["visibility"],
        };
}

export type MessagesStore = Store<MessagesState> & {
	ingestPage(conversationId: string, page: ConversationMessagesState): void;
	ingestMessage(message: Message): void;
	ingestRealtime(event: MessageCreatedEvent): Message;
	removeMessage(conversationId: string, messageId: string): void;
	finalizeMessage(
		conversationId: string,
		optimisticId: string,
		message: Message
	): void;
};

export function createMessagesStore(
	initialState: MessagesState = INITIAL_STATE
): MessagesStore {
	const store = createStore<MessagesState>(initialState);

	return {
		...store,
		ingestPage(conversationId, page) {
			store.setState((state) => applyPage(state, conversationId, page));
		},
		ingestMessage(message) {
			store.setState((state) => applyMessage(state, message));
		},
		ingestRealtime(event) {
			const message = normalizeRealtimeMessage(event);
			store.setState((state) => applyMessage(state, message));
			return message;
		},
		removeMessage(conversationId, messageId) {
			store.setState((state) =>
				removeMessage(state, conversationId, messageId)
			);
		},
		finalizeMessage(conversationId, optimisticId, message) {
			store.setState((state) =>
				finalizeMessage(state, conversationId, optimisticId, message)
			);
		},
	};
}

export function getConversationMessages(
	store: Store<MessagesState>,
	conversationId: string
): ConversationMessagesState | undefined {
	return store.getState().conversations[conversationId];
}
