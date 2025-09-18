"use client";

import type { RealtimeEvent } from "@cossistant/types";
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebsite } from "@/contexts/website";
import { createRealtimeEventDispatcher } from "./events";
import { useDashboardRealtime } from "./websocket";

export function DashboardRealtimeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = useQueryClient();
	const website = useWebsite();

	const dispatchEvent = useMemo(
		() =>
			createRealtimeEventDispatcher({
				queryClient,
				website: {
					id: website.id,
					slug: website.slug,
				},
			}),
		[queryClient, website.id, website.slug]
	);

	const handleRealtimeEvent = useCallback(
		(event: RealtimeEvent) => {
			dispatchEvent(event);
		},
		[dispatchEvent]
	);

	useDashboardRealtime({
		onEvent: handleRealtimeEvent,
	});

	return children;
}
