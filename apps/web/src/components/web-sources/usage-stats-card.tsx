"use client";

import { useQuery } from "@tanstack/react-query";
import { UsageBar } from "@/components/plan/usage-bar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { formatBytes } from "./utils";

type UsageStatsCardProps = {
	websiteSlug: string;
	aiAgentId: string | null;
};

export function UsageStatsCard({
	websiteSlug,
	aiAgentId,
}: UsageStatsCardProps) {
	const trpc = useTRPC();

	const { data: stats, isLoading } = useQuery(
		trpc.linkSource.getTrainingStats.queryOptions({
			websiteSlug,
			aiAgentId,
		})
	);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<div className="space-y-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-4">
				<UsageBar
					current={stats.linkSourcesCount}
					label="Link Sources"
					limit={stats.planLimitLinks}
				/>
				<UsageBar
					current={stats.urlKnowledgeCount}
					label="Total Pages"
					limit={stats.totalPagesLimit}
				/>
				<UsageBar
					current={stats.totalSizeBytes}
					formatValue={(current, limit) =>
						limit === null
							? `${formatBytes(current)} / Unlimited`
							: `${formatBytes(current)} / ${formatBytes(limit)}`
					}
					label="Knowledge Base Size"
					limit={stats.planLimitBytes}
				/>
			</div>
		</div>
	);
}

/**
 * Hook to get usage stats for checking limits
 */
export function useUsageStats({
	websiteSlug,
	aiAgentId,
}: {
	websiteSlug: string;
	aiAgentId: string | null;
}) {
	const trpc = useTRPC();

	const { data: stats, isLoading } = useQuery(
		trpc.linkSource.getTrainingStats.queryOptions({
			websiteSlug,
			aiAgentId,
		})
	);

	const isAtLinkLimit =
		stats?.planLimitLinks !== null &&
		stats?.planLimitLinks !== undefined &&
		(stats?.linkSourcesCount ?? 0) >= stats.planLimitLinks;

	const isNearLinkLimit =
		stats?.planLimitLinks !== null &&
		stats?.planLimitLinks !== undefined &&
		(stats?.linkSourcesCount ?? 0) >= stats.planLimitLinks * 0.8;

	return {
		stats,
		isLoading,
		isAtLinkLimit,
		isNearLinkLimit,
	};
}

export type { UsageStatsCardProps };
