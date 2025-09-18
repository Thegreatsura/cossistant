import type {
	RealtimeEvent,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";
import type { QueryClient } from "@tanstack/react-query";

type WebsiteContext = {
	id: string;
	slug: string;
};

export type RealtimeEventHandlerContext = {
	queryClient: QueryClient;
	website: WebsiteContext;
};

export type RealtimeEventHandlerParams<T extends RealtimeEventType> = {
	event: RealtimeEvent<T>;
	context: RealtimeEventHandlerContext;
};

export type RealtimeEventHandler<T extends RealtimeEventType> = (
	params: RealtimeEventHandlerParams<T>
) => void | Promise<void>;

export type RealtimeEventHandlersMap = {
	[T in RealtimeEventType]?: RealtimeEventHandler<T>[];
};
