"use client";

import { useRealtimeEvents } from "@cossistant/next";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useUserSession, useWebsite } from "@/contexts/website";
import { handlers } from "./events";
import type { DashboardRealtimeContext } from "./events/types";
import { useDashboardRealtime } from "./websocket";

export function DashboardRealtimeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = useQueryClient();
	const website = useWebsite();
	const { subscribe } = useDashboardRealtime();
	const { user } = useUserSession();

	const subscription = useCallback(
		(handler: Parameters<typeof subscribe>[0]) => subscribe(handler),
		[subscribe]
	);

	const realtimeContext = useMemo<DashboardRealtimeContext>(
		() => ({
			queryClient,
			website: {
				id: website.id,
				slug: website.slug,
			},
			userId: user?.id ?? null,
		}),
		[queryClient, website.id, website.slug, user?.id]
	);

	useRealtimeEvents<DashboardRealtimeContext>({
		context: realtimeContext,
		handlers,
		subscribe: subscription,
	});

	return children;
}
