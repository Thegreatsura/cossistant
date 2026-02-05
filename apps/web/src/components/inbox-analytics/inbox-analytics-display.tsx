"use client";

import type { InboxAnalyticsResponse } from "@cossistant/types";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { INBOX_ANALYTICS_RANGES, type InboxAnalyticsRangeDays } from "./types";

type InboxAnalyticsDisplayProps = {
	data: InboxAnalyticsResponse | null;
	rangeDays: InboxAnalyticsRangeDays;
	onRangeChange: (rangeDays: InboxAnalyticsRangeDays) => void;
	isLoading?: boolean;
	isError?: boolean;
};

type MetricConfig = {
	key: keyof InboxAnalyticsResponse["current"];
	label: string;
	higherIsBetter: boolean;
	formatValue: (value: number | null) => string;
	formatSuffix?: (value: number | null) => string | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 0,
});

const formatDuration = (value: number | null): string => {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	const totalSeconds = Math.max(0, Math.round(value));
	if (totalSeconds < 60) {
		return `${totalSeconds}s`;
	}

	const totalMinutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (totalMinutes < 60) {
		return seconds > 0 ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
	}

	const totalHours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (totalHours < 24) {
		return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
	}

	const totalDays = Math.floor(totalHours / 24);
	const hours = totalHours % 24;
	return hours > 0 ? `${totalDays}d ${hours}h` : `${totalDays}d`;
};

const formatPercent = (value: number | null): string => {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	return `${Math.round(value)}%`;
};

const formatIndex = (value: number | null): string => {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	return numberFormatter.format(Math.round(value));
};

const formatCount = (value: number | null): string => {
	if (value === null || Number.isNaN(value)) {
		return "—";
	}

	return numberFormatter.format(Math.round(value));
};

const metricConfigs: MetricConfig[] = [
	{
		key: "medianResponseTimeSeconds",
		label: "Median response time",
		higherIsBetter: false,
		formatValue: formatDuration,
	},
	{
		key: "medianResolutionTimeSeconds",
		label: "Median time to resolution",
		higherIsBetter: false,
		formatValue: formatDuration,
	},
	{
		key: "aiHandledRate",
		label: "% handled by AI",
		higherIsBetter: true,
		formatValue: formatPercent,
	},
	{
		key: "satisfactionIndex",
		label: "Satisfaction index",
		higherIsBetter: true,
		formatValue: formatIndex,
		formatSuffix: (value) => (value === null ? null : "/100"),
	},
	{
		key: "uniqueVisitors",
		label: "Unique visitors",
		higherIsBetter: true,
		formatValue: formatCount,
	},
];

const computeDelta = (
	current: number | null,
	previous: number | null
): number | null => {
	if (
		current === null ||
		previous === null ||
		Number.isNaN(current) ||
		Number.isNaN(previous) ||
		previous === 0
	) {
		return null;
	}

	return ((current - previous) / previous) * 100;
};

export function InboxAnalyticsDisplay({
	data,
	rangeDays,
	onRangeChange,
	isLoading = false,
	isError = false,
}: InboxAnalyticsDisplayProps) {
	const metrics = useMemo(
		() =>
			metricConfigs.map((config) => {
				const current = data?.current?.[config.key] ?? null;
				const previous = data?.previous?.[config.key] ?? null;
				const delta = computeDelta(current, previous);
				const trendPositive =
					delta === null
						? null
						: config.higherIsBetter
							? delta >= 0
							: delta <= 0;
				const deltaLabel =
					delta === null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;

				return {
					...config,
					current,
					previous,
					delta,
					deltaLabel,
					trendPositive,
				};
			}),
		[data]
	);

	return (
		<div className="hidden lg:block">
			{/* <div className="flex items-center justify-between gap-3">
        <ToggleGroup
          className="shrink-0"
          onValueChange={(value) => {
            const parsed = Number(value) as InboxAnalyticsRangeDays;
            if (INBOX_ANALYTICS_RANGES.includes(parsed)) {
              onRangeChange(parsed);
            }
          }}
          size="sm"
          type="single"
          value={String(rangeDays)}
          variant="outline"
        >
          <ToggleGroupItem value="7">7d</ToggleGroupItem>
          <ToggleGroupItem value="14">14d</ToggleGroupItem>
          <ToggleGroupItem value="30">Month</ToggleGroupItem>
        </ToggleGroup>
      </div> */}

			<div className="flex gap-2 overflow-x-auto">
				{metrics.map((metric) => {
					const value = metric.formatValue(metric.current);
					const suffix = metric.formatSuffix?.(metric.current) ?? null;
					const deltaClass =
						metric.trendPositive === null
							? "text-muted-foreground"
							: metric.trendPositive
								? "text-emerald-600"
								: "text-rose-600";

					return (
						<div
							className="flex h-[42px] min-w-[150px] flex-1 flex-col justify-between px-1"
							key={metric.key}
						>
							<p className="text-primary/60 text-xs">{metric.label}</p>
							<div className="flex items-center justify-start gap-2">
								{isLoading ? (
									<Skeleton className="h-5 w-16" />
								) : (
									<div className="flex items-baseline gap-1">
										<span className="font-semibold text-md text-primary">
											{value}
										</span>
										{suffix ? (
											<span className="text-muted-foreground text-xs">
												{suffix}
											</span>
										) : null}
									</div>
								)}
								{isLoading ? (
									<Skeleton className="h-4 w-10" />
								) : (
									<span className={cn("font-medium text-xs", deltaClass)}>
										{metric.deltaLabel}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
