"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

type SidebarUpgradeButtonProps = {
	websiteSlug: string;
	planInfo: PlanInfo;
};

function getClosestLimit(
	plan: PlanInfo["plan"],
	usage: PlanInfo["usage"]
): {
	label: string;
	percentage: number;
	current: number;
	limit: number;
} | null {
	const limits: Array<{
		label: string;
		current: number;
		limit: number | null;
	}> = [
		{
			label: "Conversations",
			current: usage.conversations,
			limit: plan.features.conversations,
		},
		{
			label: "Messages",
			current: usage.messages,
			limit: plan.features.messages,
		},
		{
			label: "Contacts",
			current: usage.contacts,
			limit: plan.features.contacts,
		},
		{
			label: "Team Members",
			current: usage.teamMembers,
			limit: plan.features["team-members"],
		},
	];

	// Filter out unlimited limits and calculate percentages
	const withPercentages = limits
		.filter((item) => item.limit !== null && item.limit > 0)
		.map((item) => ({
			...item,
			limit: item.limit as number,
			percentage: (item.current / (item.limit as number)) * 100,
		}))
		.sort((a, b) => b.percentage - a.percentage);

	// Return the closest to limit
	return withPercentages[0] || null;
}

export function SidebarUpgradeButton({
	websiteSlug,
	planInfo,
}: SidebarUpgradeButtonProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { plan, usage } = planInfo;

	// Only show for non-paid plans
	if (plan.name === "hobby") {
		return null;
	}

	const closestLimit = getClosestLimit(plan, usage);

	return (
		<>
			<Button
				className="w-full justify-start gap-2 text-left"
				onClick={() => setIsModalOpen(true)}
				size="sm"
				variant="outline"
			>
				<ArrowUpRight className="size-4" />
				<div className="flex-1 overflow-hidden">
					<div className="font-medium text-xs">Upgrade Plan</div>
					{closestLimit && closestLimit.percentage >= 50 && (
						<div className="truncate text-primary/60 text-xs">
							{closestLimit.current.toLocaleString()} /{" "}
							{closestLimit.limit.toLocaleString()} {closestLimit.label}
						</div>
					)}
				</div>
			</Button>
			<UpgradeModal
				currentPlan={plan}
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				targetPlanName="hobby"
				websiteSlug={websiteSlug}
			/>
		</>
	);
}
