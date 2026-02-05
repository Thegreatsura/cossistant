"use client";

import { useQuery } from "@tanstack/react-query";
import type { InboxAnalyticsRangeDays } from "@/components/inbox-analytics";
import { useTRPC } from "@/lib/trpc/client";

const STALE_TIME = 300_000;

export function useInboxAnalytics({
	websiteSlug,
	rangeDays,
	enabled = true,
}: {
	websiteSlug: string;
	rangeDays: InboxAnalyticsRangeDays;
	enabled?: boolean;
}) {
	const trpc = useTRPC();

	return useQuery({
		...trpc.conversation.getInboxAnalytics.queryOptions({
			websiteSlug,
			rangeDays,
		}),
		enabled,
		staleTime: STALE_TIME,
		refetchInterval: STALE_TIME,
	});
}
