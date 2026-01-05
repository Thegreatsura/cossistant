"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
} from "@/components/ui/layout/settings-layout";
import { Spinner } from "@/components/ui/spinner";
import { TooltipOnHover } from "@/components/ui/tooltip";
import {
	AddWebsiteDialog,
	DomainTree,
	KnowledgePreviewWrapper,
	UsageStatsCard,
	useLinkSourceMutations,
	useMergedDomainTree,
	useUsageStats,
} from "@/components/web-sources";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";

export default function WebSourcesPage() {
	const website = useWebsite();
	const trpc = useTRPC();
	const [showAddDialog, setShowAddDialog] = useState(false);

	// Data is pre-fetched in the layout, so it will be available immediately
	const { data: aiAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Get usage stats for limit checks
	const { stats, isAtLinkLimit, isNearLinkLimit } = useUsageStats({
		websiteSlug: website.slug,
		aiAgentId: aiAgent?.id ?? null,
	});

	// Get domain tree data for crawling status
	const { hasAnyCrawling } = useMergedDomainTree({
		websiteSlug: website.slug,
		aiAgentId: aiAgent?.id ?? null,
	});

	// Mutations hook for creating link sources
	const { handleCreate, isCreating } = useLinkSourceMutations({
		websiteSlug: website.slug,
		aiAgentId: aiAgent?.id ?? null,
		onCreateSuccess: () => {
			setShowAddDialog(false);
		},
	});

	const handleAddWebsite = useCallback(
		async (params: {
			url: string;
			includePaths?: string[];
			excludePaths?: string[];
		}) => {
			await handleCreate(params);
		},
		[handleCreate]
	);

	return (
		<SettingsPage>
			<SettingsHeader>
				Web Sources
				<div className="flex items-center gap-2 pr-1">
					<TooltipOnHover content="Add Website">
						<Button
							aria-label="Add Website"
							onClick={() => setShowAddDialog(true)}
							size="sm"
							type="button"
							variant="secondary"
						>
							<Icon filledOnHover name="plus" />
							Add url
						</Button>
					</TooltipOnHover>
				</div>
			</SettingsHeader>
			<PageContent className="py-6 pt-20">
				<div className="space-y-6">
					{/* Info Banner - Show when no AI agent exists */}
					{!aiAgent && (
						<Alert>
							<AlertTitle>Create an AI Agent first</AlertTitle>
							<AlertDescription>
								Before adding web sources, you need to create an AI agent. Go to
								the{" "}
								<Link
									className="font-medium underline"
									href={`/${website.slug}/agents`}
								>
									General settings
								</Link>{" "}
								to create one.
							</AlertDescription>
						</Alert>
					)}

					{/* Stats Overview */}
					{aiAgent && (
						<UsageStatsCard aiAgentId={aiAgent.id} websiteSlug={website.slug} />
					)}

					{/* Upgrade CTA when approaching limits */}
					{stats && isNearLinkLimit && stats.planLimitLinks !== null && (
						<Alert variant={isAtLinkLimit ? "destructive" : "default"}>
							<AlertCircleIcon className="h-4 w-4" />
							<AlertTitle>
								{isAtLinkLimit
									? "Link source limit reached"
									: "Approaching limit"}
							</AlertTitle>
							<AlertDescription>
								You're using{" "}
								{Math.round(
									(stats.linkSourcesCount / stats.planLimitLinks) * 100
								)}
								% of your plan's link source limit.{" "}
								<Link
									className="font-medium underline"
									href={`/${website.slug}/settings/plan`}
								>
									Upgrade your plan
								</Link>{" "}
								to add more web sources.
							</AlertDescription>
						</Alert>
					)}

					{/* Domain Tree - Unified hierarchical view */}
					{aiAgent && (
						<DomainTree aiAgentId={aiAgent.id} websiteSlug={website.slug} />
					)}

					{/* Crawling Status Banner */}
					{hasAnyCrawling && (
						<Alert>
							<Spinner className="h-4 w-4" />
							<AlertTitle>Crawling in progress</AlertTitle>
							<AlertDescription>
								Some sources are being crawled. Updates will appear
								automatically in real-time.
							</AlertDescription>
						</Alert>
					)}
				</div>
			</PageContent>

			{/* Add Website Dialog */}
			<AddWebsiteDialog
				isAtLinkLimit={isAtLinkLimit}
				isSubmitting={isCreating}
				linkLimit={stats?.planLimitLinks}
				onOpenChange={setShowAddDialog}
				onSubmit={handleAddWebsite}
				open={showAddDialog}
				websiteSlug={website.slug}
			/>

			{/* Knowledge Preview Modal */}
			<KnowledgePreviewWrapper websiteSlug={website.slug} />
		</SettingsPage>
	);
}
