import type {
	RealtimeEventHandler as BaseRealtimeEventHandler,
	RealtimeEventHandlerContext as BaseRealtimeEventHandlerContext,
	RealtimeEventHandlerParams as BaseRealtimeEventHandlerParams,
	RealtimeEventHandlersMap as BaseRealtimeEventHandlersMap,
} from "@cossistant/next/realtime";
import type { RealtimeEventType } from "@cossistant/types/realtime-events";

type WebsiteContext = {
	id: string;
	slug: string;
};

export type DashboardRealtimeContext = {
	website: WebsiteContext;
};

export type RealtimeEventHandlerContext =
	BaseRealtimeEventHandlerContext<DashboardRealtimeContext>;

export type RealtimeEventHandlerParams<T extends RealtimeEventType> =
	BaseRealtimeEventHandlerParams<T, DashboardRealtimeContext>;

export type RealtimeEventHandler<T extends RealtimeEventType> =
	BaseRealtimeEventHandler<T, DashboardRealtimeContext>;

export type RealtimeEventHandlersMap =
	BaseRealtimeEventHandlersMap<DashboardRealtimeContext>;
