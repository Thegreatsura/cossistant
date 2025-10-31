"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/client";

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
	const trpc = useTRPC();

	// Only show upgrade button if not already on hobby plan
	if (currentPlan.name === "hobby") {
		return null;
	}

	return (
		<>
			<Button onClick={() => setIsModalOpen(true)}>Upgrade Plan</Button>
			<UpgradeModal
				currentPlan={currentPlan}
				onOpenChange={setIsModalOpen}
				open={isModalOpen}
				targetPlanName="hobby"
				websiteSlug={websiteSlug}
			/>
		</>
	);
}
