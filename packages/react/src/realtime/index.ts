import type { RealtimeEventData } from "@cossistant/types/realtime-events";
import type { RealtimeEventHandler, RealtimeEventMeta } from "./use-realtime";

export type {
	RealtimeAuthConfig,
	RealtimeContextValue,
	RealtimeProviderProps,
} from "./provider";
export { RealtimeProvider, useRealtimeConnection } from "./provider";
export {
	applyConversationSeenEvent,
	hydrateConversationSeen,
	upsertConversationSeen,
} from "./seen-store";
export { SupportRealtimeProvider } from "./support-provider";
export {
	applyConversationTypingEvent,
	clearTypingFromMessage,
	clearTypingState,
	setTypingState,
} from "./typing-store";
export type {
	RealtimeEventHandler,
	RealtimeEventHandlerEntry,
	RealtimeEventHandlersMap,
	RealtimeEventMeta,
} from "./use-realtime";
export { useRealtime } from "./use-realtime";

export type MessageCreatedHandlerOptions<TContext, TMessage> = {
	shouldHandleEvent?: (
		meta: RealtimeEventMeta<"MESSAGE_CREATED", TContext>
	) => boolean;
	mapEventToMessage: (
		meta: RealtimeEventMeta<"MESSAGE_CREATED", TContext>
	) => TMessage | null | undefined;
	onMessage: (
		meta: RealtimeEventMeta<"MESSAGE_CREATED", TContext> & {
			message: TMessage;
		}
	) => void | Promise<void>;
	onTransformError?: (
		error: unknown,
		meta: RealtimeEventMeta<"MESSAGE_CREATED", TContext>
	) => void;
};

export function createMessageCreatedHandler<TContext, TMessage = unknown>({
	shouldHandleEvent,
	mapEventToMessage,
	onMessage,
	onTransformError,
}: MessageCreatedHandlerOptions<TContext, TMessage>): RealtimeEventHandler<
	"MESSAGE_CREATED",
	TContext
> {
	return (
		_data: RealtimeEventData<"MESSAGE_CREATED">,
		meta: RealtimeEventMeta<"MESSAGE_CREATED", TContext>
	) => {
		const shouldHandle = shouldHandleEvent ? shouldHandleEvent(meta) : true;

		if (!shouldHandle) {
			return;
		}

		let message: TMessage | null | undefined;

		try {
			message = mapEventToMessage(meta);
		} catch (error) {
			if (onTransformError) {
				onTransformError(error, meta);
			} else {
				console.error("[Realtime] Failed to transform MESSAGE_CREATED event", {
					error,
					eventType: meta.event.type,
				});
			}
			return;
		}

		if (!message) {
			return;
		}

		void onMessage({ ...meta, message });
	};
}
