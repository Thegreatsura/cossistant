import type { CossistantClient } from "@cossistant/core";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type React from "react";
import { useMemo } from "react";
import { useSupport } from "../provider";
import { useRealtime } from "./use-realtime";

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

	const realtimeContext = useMemo<SupportRealtimeContext>(
		() => ({
			websiteId: website?.id ?? null,
			client,
		}),
		[website?.id, client]
	);

	const events = useMemo(
		() => ({
			MESSAGE_CREATED: (
				_data: RealtimeEvent["payload"],
				{
					event,
					context,
				}: { event: RealtimeEvent; context: SupportRealtimeContext }
			) => {
				if (context.websiteId && event.websiteId !== context.websiteId) {
					return;
				}

				context.client.handleRealtimeEvent(event);
			},
		}),
		[]
	);

	useRealtime<SupportRealtimeContext>({
		context: realtimeContext,
		events,
		websiteId: realtimeContext.websiteId,
		visitorId: website?.visitor?.id ?? null,
	});

	return <>{children}</>;
}
