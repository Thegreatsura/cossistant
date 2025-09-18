import type {
	RealtimeEvent,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";
import { handleMessageCreated } from "./handlers/message-created";
import type {
	RealtimeEventHandler,
	RealtimeEventHandlerContext,
	RealtimeEventHandlersMap,
} from "./types";

const handlers: RealtimeEventHandlersMap = {
	MESSAGE_CREATED: [handleMessageCreated],
};

function getHandlersForEvent<T extends RealtimeEventType>(
	event: RealtimeEvent<T>
): RealtimeEventHandler<T>[] {
	return (handlers[event.type] as RealtimeEventHandler<T>[] | undefined) ?? [];
}

export function createRealtimeEventDispatcher(
	context: RealtimeEventHandlerContext
) {
	return <T extends RealtimeEventType>(event: RealtimeEvent<T>) => {
		const eventHandlers = getHandlersForEvent(event);

		if (eventHandlers.length === 0) {
			return;
		}

		for (const handler of eventHandlers) {
			try {
				handler({ event, context });
			} catch (error) {
				console.error("[Realtime] Event handler failed", {
					error,
					eventType: event.type,
				});
			}
		}
	};
}
