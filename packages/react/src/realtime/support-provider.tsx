import type { CossistantClient } from "@cossistant/core";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useRealtimeSupport } from "../hooks/private/use-realtime-support";
import { useSupport } from "../provider";

import {
	type RealtimeEventHandlerContext,
	type RealtimeEventHandlersMap,
	useRealtimeEvents,
} from "./index";

type SupportRealtimeContext = {
	websiteId: string | null;
	client: CossistantClient;
};

type SupportRealtimeProviderProps = {
	children: React.ReactNode;
};

/**
 * Bridges websocket events into the core client stores so support hooks stay
 * in sync without forcing refetches.
 */
export function SupportRealtimeProvider({
	children,
}: SupportRealtimeProviderProps) {
	const { website, client } = useSupport();
	const { subscribe } = useRealtimeSupport();

	const realtimeContext = useMemo<
		RealtimeEventHandlerContext<SupportRealtimeContext>
	>(
		() => ({
			websiteId: website?.id ?? null,
			client,
		}),
		[website?.id, client]
	);

	const handlers = useMemo<RealtimeEventHandlersMap<SupportRealtimeContext>>(
		() => ({
			MESSAGE_CREATED: [
				({ event, context }) => {
					if (context.websiteId && event.data.websiteId !== context.websiteId) {
						return;
					}

					context.client.handleRealtimeEvent(event);
				},
			],
		}),
		[]
	);

	const subscribeToEvents = useCallback(
		(handler: (event: RealtimeEvent) => void) => subscribe(handler),
		[subscribe]
	);

	useRealtimeEvents<SupportRealtimeContext>({
		context: realtimeContext,
		handlers,
		subscribe: subscribeToEvents,
	});

	return <>{children}</>;
}
