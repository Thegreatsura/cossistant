import type {
	RealtimeEventHandler as BaseRealtimeEventHandler,
	RealtimeEventHandlerContext as BaseRealtimeEventHandlerContext,
	RealtimeEventHandlerParams as BaseRealtimeEventHandlerParams,
	RealtimeEventHandlersMap as BaseRealtimeEventHandlersMap,
} from "@cossistant/next/realtime";
import type { RealtimeEventType } from "@cossistant/types/realtime-events";
import type { QueryClient } from "@tanstack/react-query";

type WebsiteContext = {
	id: string;
	slug: string;
};

export type DashboardRealtimeContext = {
	queryClient: QueryClient;
	website: WebsiteContext;
	userId: string | null;
};

export type RealtimeEventHandlerContext =
	BaseRealtimeEventHandlerContext<DashboardRealtimeContext>;

export type RealtimeEventHandlerParams<T extends RealtimeEventType> =
	BaseRealtimeEventHandlerParams<T, DashboardRealtimeContext>;

export type RealtimeEventHandler<T extends RealtimeEventType> =
	BaseRealtimeEventHandler<T, DashboardRealtimeContext>;

export type RealtimeEventHandlersMap =
	BaseRealtimeEventHandlersMap<DashboardRealtimeContext>;
