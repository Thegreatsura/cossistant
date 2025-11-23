"use client";

import { PLAN_CONFIG, type PlanName } from "@api/lib/plans/config";
import type { RouterOutputs } from "@cossistant/api/types";
import { useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import { Button } from "@/components/ui/button";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

type UpgradeButtonProps = {
	currentPlan: PlanInfo["plan"];
	websiteSlug: string;
};

export function UpgradeButton({
	currentPlan,
	websiteSlug,
}: UpgradeButtonProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const proPlan = PLAN_CONFIG.pro;
	const nextPlanName: PlanName | null =
		currentPlan.name === "pro" || !proPlan ? null : "pro";

	const buttonLabel = nextPlanName
		? `Upgrade to ${PLAN_CONFIG[nextPlanName].displayName}`
		: "Change plan";

	const initialPlanName = nextPlanName ?? currentPlan.name;

	return (
		<>
			<Button onClick={() => setIsModalOpen(true)} type="button">
				{buttonLabel}
			</Button>
			<UpgradeModal
				currentPlan={currentPlan}
				initialPlanName={initialPlanName}
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				websiteSlug={websiteSlug}
			/>
		</>
	);
}
