"use client";

import { PLAN_CONFIG, type PlanName } from "@api/lib/plans/config";
import type { RouterOutputs } from "@cossistant/api/types";
import { useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import { Button } from "@/components/ui/button";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

const PLAN_SEQUENCE: PlanName[] = ["free", "hobby", "pro"];

type UpgradeButtonProps = {
	currentPlan: PlanInfo["plan"];
	websiteSlug: string;
};

export function UpgradeButton({
	currentPlan,
	websiteSlug,
}: UpgradeButtonProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);

	const currentIndex = PLAN_SEQUENCE.indexOf(currentPlan.name as PlanName);
	const nextPlanName =
		currentIndex >= 0 && currentIndex < PLAN_SEQUENCE.length - 1
			? PLAN_SEQUENCE[currentIndex + 1]
			: null;

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
