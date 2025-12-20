"use client";

export type {
	Align,
	ContentProps,
	CustomPage,
	RootProps,
	Side,
	SupportProps,
	// Note: TriggerRenderProps is exported from primitives to avoid duplication
	WebSocketContextValue,
} from "@cossistant/react/support";

export {
	Support,
	useSupportConfig,
	useSupportNavigation,
	useSupportStore,
	useWebSocket,
	WebSocketProvider,
} from "@cossistant/react/support";
