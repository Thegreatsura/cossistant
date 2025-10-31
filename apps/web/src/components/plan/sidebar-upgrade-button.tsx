"use client";

import { type FeatureKey, PLAN_CONFIG } from "@api/lib/plans/config";
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

	// Only show for free plans
	if (plan.name !== "free") {
		return null;
	}

	const closestLimit = getClosestLimit(plan, usage);

	if (!closestLimit) {
		return null;
	}

	const hobbyPlanLimit =
		PLAN_CONFIG.hobby.features[
			closestLimit.label.toLowerCase().replace(" ", "-") as FeatureKey
		];

	return (
		<>
			<button
				className="flex h-auto w-full flex-col justify-start gap-2 border border-primary/10 border-dashed bg-background-100 p-4 text-left hover:bg-background-200"
				onClick={() => setIsModalOpen(true)}
				type="button"
			>
				<div className="flex flex-col gap-2">
					<div className="font-medium text-base">Upgrade to Hobby</div>
					<div className="font-medium text-overflow-ellipsis text-xs">
						Your {closestLimit.label.toLowerCase()} limit will go from{" "}
						{closestLimit.limit.toLocaleString()} to{" "}
						{hobbyPlanLimit !== null && hobbyPlanLimit !== undefined
							? typeof hobbyPlanLimit === "number"
								? hobbyPlanLimit.toLocaleString()
								: "unlimited"
							: "unlimited"}
						.
					</div>
				</div>
			</button>

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
