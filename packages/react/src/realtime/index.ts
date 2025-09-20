import type {
	RealtimeEvent,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

type EmptyObject = Record<string, never>;

export type RealtimeEventHandlerContext<TContext = EmptyObject> = {
	queryClient: QueryClient;
} & TContext;

export type RealtimeEventHandlerParams<
	TType extends RealtimeEventType,
	TContext = EmptyObject,
> = {
	event: RealtimeEvent<TType>;
	context: RealtimeEventHandlerContext<TContext>;
};

export type RealtimeEventHandler<
	TType extends RealtimeEventType,
	TContext = EmptyObject,
> = (
	params: RealtimeEventHandlerParams<TType, TContext>
) => void | Promise<void>;

export type RealtimeEventHandlersMap<TContext = EmptyObject> = {
	[TEvent in RealtimeEventType]?: RealtimeEventHandler<TEvent, TContext>[];
};

type CreateRealtimeEventDispatcherOptions<TContext> = {
	context: RealtimeEventHandlerContext<TContext>;
	handlers: RealtimeEventHandlersMap<TContext>;
	onError?: (error: unknown, eventType: RealtimeEventType) => void;
};

export type RealtimeEventDispatcher<TContext = EmptyObject> = <
	TType extends RealtimeEventType,
>(
	event: RealtimeEvent<TType>
) => void;

export function createRealtimeEventDispatcher<TContext = EmptyObject>({
	context,
	handlers,
	onError,
}: CreateRealtimeEventDispatcherOptions<TContext>): RealtimeEventDispatcher<TContext> {
	return <TType extends RealtimeEventType>(event: RealtimeEvent<TType>) => {
		const eventHandlers =
			(handlers[event.type] as
				| RealtimeEventHandler<TType, TContext>[]
				| undefined) ?? [];

		if (eventHandlers.length === 0) {
			return;
		}

		for (const handler of eventHandlers) {
			try {
				handler({
					event,
					context,
				});
			} catch (error) {
				if (onError) {
					onError(error, event.type);
				} else {
					console.error("[Realtime] Event handler failed", {
						error,
						eventType: event.type,
					});
				}
			}
		}
	};
}

type MessageCreatedContext<TContext> = RealtimeEventHandlerParams<
	"MESSAGE_CREATED",
	TContext
>;

type MessageCreatedTransformResult<TMessage> = TMessage | null | undefined;

export type MessageCreatedHandlerOptions<TContext, TMessage> = {
	shouldHandleEvent?: (params: MessageCreatedContext<TContext>) => boolean;
	mapEventToMessage: (
		params: MessageCreatedContext<TContext>
	) => MessageCreatedTransformResult<TMessage>;
	onMessage: (
		params: MessageCreatedContext<TContext> & {
			message: TMessage;
		}
	) => void | Promise<void>;
	onTransformError?: (
		error: unknown,
		params: MessageCreatedContext<TContext>
	) => void;
};

export function createMessageCreatedHandler<
	TContext = EmptyObject,
	TMessage = unknown,
>({
	shouldHandleEvent,
	mapEventToMessage,
	onMessage,
	onTransformError,
}: MessageCreatedHandlerOptions<TContext, TMessage>): RealtimeEventHandler<
	"MESSAGE_CREATED",
	TContext
> {
	return (params) => {
		const shouldHandle = shouldHandleEvent ? shouldHandleEvent(params) : true;

		if (!shouldHandle) {
			return;
		}

		let message: MessageCreatedTransformResult<TMessage>;

		try {
			message = mapEventToMessage(params);
		} catch (error) {
			if (onTransformError) {
				onTransformError(error, params);
			} else {
				console.error("[Realtime] Failed to transform MESSAGE_CREATED event", {
					error,
					eventType: params.event.type,
				});
			}
			return;
		}

		if (!message) {
			return;
		}

		return onMessage({
			...params,
			message,
		});
	};
}

export { SupportRealtimeProvider } from "./support-provider";

type SubscribeToRealtimeEvents = (
	handler: (event: RealtimeEvent) => void
) => () => void;

export type UseRealtimeEventsOptions<TContext = EmptyObject> = {
	context: RealtimeEventHandlerContext<TContext>;
	handlers: RealtimeEventHandlersMap<TContext>;
	subscribe: SubscribeToRealtimeEvents;
	onError?: (error: unknown, eventType: RealtimeEventType) => void;
};

export function useRealtimeEvents<TContext = EmptyObject>({
	context,
	handlers,
	subscribe,
	onError,
}: UseRealtimeEventsOptions<TContext>): RealtimeEventDispatcher<TContext> {
	const dispatcher = useMemo(
		() =>
			createRealtimeEventDispatcher<TContext>({
				context,
				handlers,
				onError,
			}),
		[context, handlers, onError]
	);

	useEffect(() => {
		return subscribe(dispatcher);
	}, [subscribe, dispatcher]);

	return dispatcher;
}
