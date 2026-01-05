"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { AI_MODELS } from "@cossistant/types";
import { useState } from "react";
import { UpgradeModal } from "@/components/plan/upgrade-modal";
import Icon, { type IconName } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type ModelSelectProps = {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	isFreePlan: boolean;
	websiteSlug: string;
	planInfo: RouterOutputs["plan"]["getPlanInfo"] | undefined;
	/** Optional label to show above the select */
	label?: string;
	/** Optional description to show below the select */
	description?: string;
};

export function ModelSelect({
	value,
	onChange,
	disabled,
	isFreePlan,
	websiteSlug,
	planInfo,
	label,
	description,
}: ModelSelectProps) {
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);

	const handleValueChange = (newValue: string) => {
		const selectedModel = AI_MODELS.find((m) => m.value === newValue);
		const isPaidModel =
			selectedModel &&
			"requiresPaid" in selectedModel &&
			selectedModel.requiresPaid;

		if (isFreePlan && isPaidModel) {
			setShowUpgradeModal(true);
			return;
		}

		onChange(newValue);
	};

	return (
		<>
			<div className="space-y-2">
				{label && <Label htmlFor="model-select">{label}</Label>}
				<Select
					disabled={disabled}
					onValueChange={handleValueChange}
					value={value}
				>
					<SelectTrigger id="model-select">
						<SelectValue placeholder="Select a model" />
					</SelectTrigger>
					<SelectContent>
						{AI_MODELS.map((model) => {
							const isPaidModel = "requiresPaid" in model && model.requiresPaid;
							const showUpgradeBadge = isFreePlan && isPaidModel;

							return (
								<SelectItem key={model.value} value={model.value}>
									<span className="flex items-center gap-2">
										<Icon
											className="size-4 text-foreground"
											name={model.icon as IconName}
										/>
										<span>{model.label}</span>
										<span className="text-muted-foreground text-xs">
											({model.provider})
										</span>
										{showUpgradeBadge && (
											<span className="rounded bg-cossistant-orange/10 px-1.5 py-0.5 font-medium text-[10px] text-cossistant-orange">
												Upgrade
											</span>
										)}
									</span>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
				<div className="flex items-center justify-between">
					{description && (
						<p className="text-muted-foreground text-xs">{description}</p>
					)}
					{isFreePlan && (
						<button
							className="font-medium text-cossistant-orange text-sm hover:underline"
							onClick={() => setShowUpgradeModal(true)}
							type="button"
						>
							Upgrade for more models
						</button>
					)}
				</div>
			</div>

			{/* Upgrade Modal */}
			{planInfo && (
				<UpgradeModal
					currentPlan={planInfo.plan}
					highlightedFeatureKey="latest-ai-models"
					initialPlanName="hobby"
					onOpenChange={setShowUpgradeModal}
					open={showUpgradeModal}
					websiteSlug={websiteSlug}
				/>
			)}
		</>
	);
}
