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

	const dashboardContext = useMemo<DashboardRealtimeContext>(
		() => ({
			website: {
				id: website.id,
				slug: website.slug,
			},
			userId: user?.id ?? null,
		}),
		[website.id, website.slug, user?.id]
	);

	const subscription = useCallback(
		(handler: Parameters<typeof subscribe>[0]) => subscribe(handler),
		[subscribe]
	);

	const realtimeContext = useMemo(
		() => ({
			queryClient,
			...dashboardContext,
		}),
		[queryClient, dashboardContext]
	);

	useRealtimeEvents<DashboardRealtimeContext>({
		context: realtimeContext,
		handlers,
		subscribe: subscription,
	});

	return children;
}
