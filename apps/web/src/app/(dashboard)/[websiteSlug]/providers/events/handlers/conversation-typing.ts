import {
	applyConversationTypingEvent,
	clearTypingFromMessage,
} from "@cossistant/react/realtime/typing-store";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { DashboardRealtimeContext } from "../types";

type ConversationTypingEvent = RealtimeEvent<"CONVERSATION_TYPING">;
type MessageCreatedEvent = RealtimeEvent<"MESSAGE_CREATED">;

export function handleConversationTyping({
	event,
	context,
}: {
	event: ConversationTypingEvent;
	context: DashboardRealtimeContext;
}) {
	if (event.websiteId !== context.website.id) {
		return;
	}

	// Update typing store, but ignore events from the current user (their own typing)
	applyConversationTypingEvent(event, {
		ignoreUserId: context.userId,
	});
}

export function handleMessageCreatedTypingClear(event: MessageCreatedEvent) {
	// Clear typing state when a message is sent
	clearTypingFromMessage(event);
}
