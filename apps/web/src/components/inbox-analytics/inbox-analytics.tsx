"use client";

import { useState } from "react";
import { useInboxAnalytics } from "@/data/use-inbox-analytics";
import { InboxAnalyticsDisplay } from "./inbox-analytics-display";
import type { InboxAnalyticsRangeDays } from "./types";

const DEFAULT_RANGE: InboxAnalyticsRangeDays = 7;

export function InboxAnalytics({ websiteSlug }: { websiteSlug: string }) {
	const [rangeDays, setRangeDays] =
		useState<InboxAnalyticsRangeDays>(DEFAULT_RANGE);

	const query = useInboxAnalytics({
		websiteSlug,
		rangeDays,
		// Analytics now available for all websites via Tinybird
		enabled: true,
	});

	return (
		<InboxAnalyticsDisplay
			data={query.data ?? null}
			isError={query.isError}
			isLoading={query.isLoading || query.isFetching}
			onRangeChange={setRangeDays}
			rangeDays={rangeDays}
		/>
	);
}
