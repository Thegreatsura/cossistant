import type {
	ConversationPagination,
	ConversationsState,
} from "@cossistant/core";
import type { Conversation } from "@cossistant/types";
import { useSupport } from "../provider";
import { useStoreSelector } from "./use-store-selector";

type ConversationSelection = {
	conversations: Conversation[];
	pagination: ConversationPagination | null;
};

function areSelectionsEqual(a: ConversationSelection, b: ConversationSelection): boolean {
	if (a === b) {
		return true;
	}
	if (a.pagination !== b.pagination) {
		if (!a.pagination || !b.pagination) {
			return false;
		}
		if (
			a.pagination.page !== b.pagination.page ||
			a.pagination.limit !== b.pagination.limit ||
			a.pagination.total !== b.pagination.total ||
			a.pagination.totalPages !== b.pagination.totalPages ||
			a.pagination.hasMore !== b.pagination.hasMore
		) {
			return false;
		}
	}
	if (a.conversations.length !== b.conversations.length) {
		return false;
	}
	for (let index = 0; index < a.conversations.length; index += 1) {
		if (a.conversations[index] !== b.conversations[index]) {
			return false;
		}
	}
	return true;
}

export function useConversationsStore(): ConversationSelection {
	const { client } = useSupport();

	if (!client) {
		throw new Error("useConversationsStore requires a configured Cossistant client");
	}

	return useStoreSelector(
		client.conversationsStore,
		(state: ConversationsState) => ({
			conversations: state.ids
				.map((id) => state.byId[id])
				.filter((conversation): conversation is Conversation => conversation !== undefined),
			pagination: state.pagination,
		}),
		areSelectionsEqual
	);
}

export function useConversationById(conversationId: string | null): Conversation | null {
	const { client } = useSupport();

	if (!client) {
		throw new Error("useConversationById requires a configured Cossistant client");
	}

	return useStoreSelector(client.conversationsStore, (state) => {
		if (!conversationId) {
			return null;
		}
		return state.byId[conversationId] ?? null;
	});
}
