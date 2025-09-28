import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useRealtimeSupport } from "../hooks/utils/use-realtime-support";
import { useSupport } from "../provider";

import {
	type RealtimeEventHandlerContext,
	type RealtimeEventHandlersMap,
	useRealtimeEvents,
} from "./index";

type SupportRealtimeContext = {
	websiteId: string | null;
};

type Props = {
	children: React.ReactNode;
};

/**
 * Bridges websocket events into the React Query cache so conversation queries
 * reflect inbound messages without refetching.
 */
export function SupportRealtimeProvider({ children }: Props) {
	const { website } = useSupport();
	const { subscribe } = useRealtimeSupport();

	const realtimeContext = useMemo<
		RealtimeEventHandlerContext<SupportRealtimeContext>
	>(
		() => ({
			websiteId: website?.id ?? null,
		}),
		[website?.id]
	);

	const handlers = useMemo<RealtimeEventHandlersMap<SupportRealtimeContext>>(
		() => ({
			// MESSAGE_CREATED: [createSupportMessageCreatedHandler()],
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
