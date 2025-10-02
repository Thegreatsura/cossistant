"use client";

import {
	type RealtimeEventHandlersMap,
	useRealtime,
} from "@cossistant/next/realtime";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";
import { useUserSession, useWebsite } from "@/contexts/website";
import { handleConversationSeen } from "./events/handlers/conversation-seen";
import { handleMessageCreated } from "./events/handlers/message-created";
import type { DashboardRealtimeContext } from "./events/types";

export function DashboardRealtimeProvider({
	children,
}: {
	children: ReactNode;
}) {
	const queryClient = useQueryClient();
	const website = useWebsite();
	const { user } = useUserSession();

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

	const events = useMemo<RealtimeEventHandlersMap<DashboardRealtimeContext>>(
		() => ({
			MESSAGE_CREATED: [
				(_data, meta) => {
					void handleMessageCreated({
						event: meta.event,
						context: meta.context,
					});
				},
			],
			CONVERSATION_SEEN: [
				(_data, meta) => {
					void handleConversationSeen({
						event: meta.event,
						context: meta.context,
					});
				},
			],
		}),
		[]
	);

	useRealtime<DashboardRealtimeContext>({
		context: realtimeContext,
		websiteId: website.id,
		events,
		onEventError: (error, event) => {
			console.error("[DashboardRealtime] handler failed", {
				error,
				eventType: event.type,
			});
		},
	});

	return children;
}
