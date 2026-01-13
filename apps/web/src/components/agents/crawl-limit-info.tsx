"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import Icon from "@/components/ui/icons";

type CrawlLimitInfoProps = {
	/** The crawl page limit (null = unlimited) */
	limit: number | null;
	/** Number of pages discovered on the website */
	discoveredCount?: number;
	/** Whether the user is on the free plan */
	isFreePlan: boolean;
	/** Website slug for upgrade modal */
	websiteSlug: string;
	/** Plan info for upgrade modal */
	planInfo: RouterOutputs["plan"]["getPlanInfo"] | undefined;
	/** Optional className for styling */
	className?: string;
};

export function CrawlLimitInfo({
	limit,
	discoveredCount,
	isFreePlan,
	websiteSlug,
	planInfo,
	className,
}: CrawlLimitInfoProps) {
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);

	// Calculate how many pages will actually be crawled
	const pagesToCrawl =
		limit === null
			? (discoveredCount ?? 0)
			: Math.min(limit, discoveredCount ?? limit);

	const hasDiscoveredPages =
		discoveredCount !== undefined && discoveredCount > 0;
	// Only show upgrade prompt for free plan users when limit is exceeded
	const showUpgradePrompt =
		isFreePlan &&
		limit !== null &&
		discoveredCount !== undefined &&
		discoveredCount > limit;

	return (
		<>
			<div className={className}>
				{hasDiscoveredPages ? (
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<Icon className="size-4 text-muted-foreground" name="globe" />
							<p className="text-sm">
								<span className="font-medium text-foreground">
									{discoveredCount.toLocaleString()}
								</span>{" "}
								<span className="text-muted-foreground">
									{discoveredCount === 1 ? "page" : "pages"} discovered
								</span>
							</p>
						</div>
						{showUpgradePrompt ? (
							<p className="pl-6 text-cossistant-orange text-sm">
								Only{" "}
								<span className="font-medium">
									{pagesToCrawl.toLocaleString()}
								</span>{" "}
								will be crawled with your current plan.{" "}
								<button
									className="font-medium underline hover:no-underline"
									onClick={() => setShowUpgradeModal(true)}
									type="button"
								>
									Upgrade to crawl all {discoveredCount.toLocaleString()} pages
								</button>
							</p>
						) : (
							<p className="pl-6 text-muted-foreground text-sm">
								All pages will be added to your knowledge base
							</p>
						)}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Up to{" "}
						<span className="font-medium text-foreground">
							{limit === null ? "unlimited" : limit.toLocaleString()}
						</span>{" "}
						pages will be crawled
						{isFreePlan && (
							<button
								className="ml-1 font-medium text-cossistant-orange hover:underline"
								onClick={() => setShowUpgradeModal(true)}
								type="button"
							>
								Upgrade for more
							</button>
						)}
					</p>
				)}
			</div>
			{/* Upgrade Modal */}
			{planInfo && (
				<UpgradeModal
					currentPlan={planInfo.plan}
					highlightedFeatureKey="ai-agent-crawl-pages-per-source"
					initialPlanName="hobby"
					onOpenChange={setShowUpgradeModal}
					open={showUpgradeModal}
					websiteSlug={websiteSlug}
				/>
			)}
		</>
	);
}
