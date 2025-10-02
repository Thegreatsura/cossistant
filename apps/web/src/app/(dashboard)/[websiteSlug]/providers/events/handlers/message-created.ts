import { createMessageCreatedHandler } from "@cossistant/next/realtime";
import type { MessageType, MessageVisibility } from "@cossistant/types";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import {
        type ConversationMessage,
        upsertConversationMessageInCache,
} from "@/data/conversation-message-cache";
import type { DashboardRealtimeContext } from "../types";

type MessageCreatedEvent = RealtimeEvent<"MESSAGE_CREATED">;

type ConversationMessagesQueryInput = {
	conversationId?: string;
	websiteSlug?: string;
};

type QueryKeyInput = {
	input?: ConversationMessagesQueryInput;
	type?: string;
};

function toConversationMessage(
        eventMessage: MessageCreatedEvent["payload"]["message"]
): ConversationMessage {
        return {
		...eventMessage,
		type: eventMessage.type as MessageType,
		visibility: eventMessage.visibility as MessageVisibility,
		createdAt: new Date(eventMessage.createdAt),
		updatedAt: new Date(eventMessage.updatedAt),
		deletedAt: eventMessage.deletedAt ? new Date(eventMessage.deletedAt) : null,
	};
}

function extractQueryInput(
	queryKey: readonly unknown[]
): ConversationMessagesQueryInput | null {
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

function isInfiniteQueryKey(queryKey: readonly unknown[]): boolean {
	const marker = queryKey[2];
	return Boolean(
		marker &&
			typeof marker === "object" &&
			"type" in marker &&
			(marker as QueryKeyInput).type === "infinite"
	);
}

export const handleMessageCreated = createMessageCreatedHandler<
        DashboardRealtimeContext,
        ConversationMessage
>({
                shouldHandleEvent: ({ event, context }) => {
                        return event.websiteId === context.website.id;
                },
                mapEventToMessage: ({ event }) =>
                        toConversationMessage(event.payload.message),
                onMessage: ({ event, context, message }) => {
                        const { queryClient, website } = context;
                        const { payload } = event;

                        const queries = queryClient
                                .getQueryCache()
                                .findAll({ queryKey: [["conversation", "getConversationMessages"]] });

			for (const query of queries) {
				const queryKey = query.queryKey as readonly unknown[];

				if (!isInfiniteQueryKey(queryKey)) {
					continue;
				}

				const input = extractQueryInput(queryKey);
				if (!input) {
					continue;
				}

                                if (input.conversationId !== payload.conversationId) {
                                        continue;
                                }

				if (input.websiteSlug !== website.slug) {
					continue;
				}

                                upsertConversationMessageInCache(queryClient, queryKey, message);
                        }
                },
        });
