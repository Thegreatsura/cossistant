"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

type TrainingSummarySidebarProps = {
	aiAgentId?: string | null;
};

function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 KB";
	}

	const kb = bytes / 1024;
	if (kb < 1024) {
		return `${Math.round(kb)} KB`;
	}

	const mb = kb / 1024;
	return `${mb.toFixed(1)} MB`;
}

export function TrainingSummarySidebar({
	aiAgentId,
}: TrainingSummarySidebarProps) {
	const website = useWebsite();
	const trpc = useTRPC();

	const { data: stats, isLoading } = useQuery(
		trpc.linkSource.getTrainingStats.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgentId ?? null,
		})
	);

	const totalSizeFormatted = stats ? formatBytes(stats.totalSizeBytes) : "0 KB";
	const limitFormatted = stats?.planLimitBytes
		? formatBytes(stats.planLimitBytes)
		: "Unlimited";

	const usagePercentage = stats?.planLimitBytes
		? Math.min(
				100,
				Math.round((stats.totalSizeBytes / stats.planLimitBytes) * 100)
			)
		: 0;

	const isNearLimit = usagePercentage >= 80;
	const isAtLimit = usagePercentage >= 100;

	return (
		<ResizableSidebar
			className="hidden lg:flex"
			position="right"
			sidebarTitle="Sources"
		>
			<SidebarContainer>
				<div className="flex flex-col gap-6">
					<div className="px-1 pt-2">
						<h3 className="mb-4 font-medium text-sm">Sources</h3>
						{isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-5 w-full" />
								<Skeleton className="h-5 w-full" />
								<Skeleton className="h-5 w-full" />
							</div>
						) : (
							<div className="flex flex-col gap-2">
								<SourceRow
									count={stats?.urlKnowledgeCount ?? 0}
									icon="dashboard"
									label="Pages"
									limit={stats?.totalPagesLimit}
								/>
								<SourceRow
									count={stats?.faqKnowledgeCount ?? 0}
									icon="help"
									label="FAQs"
								/>
								<SourceRow
									count={stats?.articleKnowledgeCount ?? 0}
									icon="file"
									label="Files"
								/>
							</div>
						)}
					</div>

					<div className="border-primary/10 border-t px-1 pt-4 dark:border-primary/5">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-muted-foreground text-xs">Total size</span>
							<span className="font-medium text-xs">
								{totalSizeFormatted} / {limitFormatted}
							</span>
						</div>
						{stats?.planLimitBytes ? (
							<Progress
								className={cn(
									"h-2",
									isAtLimit && "bg-destructive/20",
									isNearLimit && !isAtLimit && "bg-warning/20"
								)}
								indicatorClassName={cn(
									isAtLimit && "bg-destructive",
									isNearLimit && !isAtLimit && "bg-warning"
								)}
								value={usagePercentage}
							/>
						) : (
							<Progress className="h-2" value={0} />
						)}
						{isAtLimit && (
							<p className="mt-2 text-destructive text-xs">
								You've reached your plan's storage limit.{" "}
								<a
									className="underline hover:text-destructive/80"
									href={`/${website.slug}/settings/plan`}
								>
									Upgrade your plan
								</a>{" "}
								to add more sources.
							</p>
						)}
					</div>

					<Button className="w-full" disabled size="sm" variant="secondary">
						<Icon className="mr-2 size-4" name="play" />
						Retrain Agent
					</Button>
					<p className="text-center text-muted-foreground text-xs">
						Training will be available once you add sources.
					</p>
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}

type SourceRowProps = {
	icon: "dashboard" | "help" | "file";
	label: string;
	count: number;
	size?: number;
	limit?: number | null;
};

function SourceRow({ icon, label, count, size, limit }: SourceRowProps) {
	const sizeFormatted = size !== undefined ? formatBytes(size) : null;
	const limitText = limit !== null && limit !== undefined ? `/ ${limit}` : null;

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<Icon className="size-4 text-muted-foreground" name={icon} />
				<span className="text-sm">{label}</span>
			</div>
			<div className="flex items-center gap-1.5 text-right">
				<span className="font-medium text-sm">
					{count}
					{limitText && (
						<span className="text-muted-foreground"> {limitText}</span>
					)}
				</span>
				{sizeFormatted && (
					<span className="text-muted-foreground text-xs">
						({sizeFormatted})
					</span>
				)}
			</div>
		</div>
	);
}

export function TrainingSummarySidebarPlaceholder() {
	return (
		<ResizableSidebar
			className="hidden lg:flex"
			position="right"
			sidebarTitle="Sources"
		>
			<SidebarContainer>
				<div className="flex flex-col gap-6">
					<div>
						<h3 className="mb-4 font-medium text-sm">Sources</h3>
						<div className="flex flex-col gap-3">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-full" />
						</div>
					</div>
					<div className="border-primary/10 border-t pt-4 dark:border-primary/5">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="mt-2 h-2 w-full" />
					</div>
					<Skeleton className="h-9 w-full" />
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
