import { createRealtimeEventDispatcher as createSharedRealtimeEventDispatcher } from "@cossistant/next/realtime";
import { handleMessageCreated } from "./handlers/message-created";
import type {
	DashboardRealtimeContext,
	RealtimeEventHandlerContext,
	RealtimeEventHandlersMap,
} from "./types";

export const handlers: RealtimeEventHandlersMap = {
	MESSAGE_CREATED: [handleMessageCreated],
};

export function createRealtimeEventDispatcher(
	context: RealtimeEventHandlerContext
) {
	return createSharedRealtimeEventDispatcher<DashboardRealtimeContext>({
		context,
		handlers,
	});
}
