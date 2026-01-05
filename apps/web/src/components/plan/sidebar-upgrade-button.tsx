"use client";

import { type FeatureKey, PLAN_CONFIG } from "@api/lib/plans/config";
import type { RouterOutputs } from "@cossistant/api/types";
import { useState } from "react";
import { BackgroundImage } from "../ui/background-image";
import { UpgradeModal } from "./upgrade-modal";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

type SidebarUpgradeButtonProps = {
	websiteSlug: string;
	planInfo: PlanInfo;
};

// FeatureValue can be boolean, number, or null
// - true or null means unlimited
// - false means disabled (0)
// - number is the actual limit
type FeatureLimit = number | boolean | null;

function normalizeLimit(limit: FeatureLimit): number | null {
	if (limit === true || limit === null) {
		return null;
	}
	if (limit === false) {
		return 0;
	}
	return limit;
}

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
		limit: FeatureLimit;
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
		.map((item) => ({ ...item, limit: normalizeLimit(item.limit) }))
		.filter(
			(item): item is typeof item & { limit: number } =>
				item.limit !== null && item.limit > 0
		)
		.map((item) => ({
			...item,
			percentage: (item.current / item.limit) * 100,
		}))
		.sort((a, b) => b.percentage - a.percentage);

	// Return the closest to limit
	return withPercentages[0] ?? null;
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

	const proPlanLimit =
		PLAN_CONFIG.pro.features[
			closestLimit.label.toLowerCase().replace(" ", "-") as FeatureKey
		];

	return (
		<>
			<button
				className="relative flex h-auto w-full flex-col justify-start gap-2 overflow-clip border border-cossistant-orange/10 border-dashed bg-background-100 p-4 text-left hover:bg-background-200"
				onClick={() => setIsModalOpen(true)}
				type="button"
			>
				<div className="flex flex-col gap-2">
					<div className="font-medium text-base text-cossistant-orange">
						Upgrade to Pro
					</div>
					<div className="font-medium text-overflow-ellipsis text-xs">
						Your {closestLimit.label.toLowerCase()} limit will go from{" "}
						{closestLimit.limit.toLocaleString()} to{" "}
						{proPlanLimit !== null && proPlanLimit !== undefined
							? typeof proPlanLimit === "number"
								? proPlanLimit.toLocaleString()
								: "unlimited"
							: "unlimited"}
						.
					</div>
				</div>
			</button>

			<UpgradeModal
				currentPlan={plan}
				initialPlanName="pro"
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				websiteSlug={websiteSlug}
			/>
		</>
	);
}
