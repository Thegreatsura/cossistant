"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTRPC } from "@/lib/trpc/client";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

type UpgradeModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentPlan: PlanInfo["plan"];
	targetPlanName: "free" | "hobby";
	websiteSlug: string;
};

function formatFeatureValue(value: number | null): string {
	if (value === null) {
		return "Unlimited";
	}
	return value.toLocaleString();
}

function FeatureRow({
	label,
	currentValue,
	targetValue,
}: {
	label: string;
	currentValue: number | null;
	targetValue: number | null;
}) {
	const isUpgrade = (current: number | null, target: number | null) => {
		if (current === null && target === null) {
			return false;
		}
		if (current === null) {
			return false; // Unlimited -> Limited is not upgrade
		}
		if (target === null) {
			return true; // Limited -> Unlimited is upgrade
		}
		return target > current;
	};

	const isSame = currentValue === targetValue;
	const upgraded = isUpgrade(currentValue, targetValue);

	return (
		<div className="flex items-center justify-between border-primary/10 border-b py-2 last:border-0">
			<span className="font-medium text-sm">{label}</span>
			<div className="flex items-center gap-3">
				<span
					className={`text-sm ${isSame ? "text-primary/60" : "text-primary/40"}`}
				>
					{formatFeatureValue(currentValue)}
				</span>
				<ArrowRight className="size-4 text-primary/40" />
				<span
					className={`font-semibold text-sm ${upgraded ? "text-primary" : ""}`}
				>
					{formatFeatureValue(targetValue)}
				</span>
				{upgraded && <Check className="size-4 text-primary" />}
			</div>
		</div>
	);
}

export function UpgradeModal({
	open,
	onOpenChange,
	currentPlan,
	targetPlanName,
	websiteSlug,
}: UpgradeModalProps) {
	const trpc = useTRPC();

	// Get target plan config
	const targetPlanConfig =
		targetPlanName === "hobby"
			? {
					name: "hobby",
					displayName: "Hobby",
					price: 29,
					features: {
						conversations: null,
						messages: null,
						contacts: 2000,
						"conversation-retention": null,
						"team-members": 4,
					},
				}
			: {
					name: "free",
					displayName: "Free",
					price: undefined,
					features: {
						conversations: 200,
						messages: 500,
						contacts: 100,
						"conversation-retention": 30,
						"team-members": 2,
					},
				};

	const { mutateAsync: createCheckout, isPending: isLoading } = useMutation(
		trpc.plan.createCheckout.mutationOptions({
			onSuccess: (data) => {
				// Redirect to Polar checkout
				window.location.href = data.checkoutUrl;
			},
			onError: (error) => {
				toast.error("We couldn't start the upgrade.");
			},
		})
	);

	const handleUpgrade = async () => {
		try {
			await createCheckout({
				websiteSlug,
				targetPlan: targetPlanName,
			});
		} catch (error) {
			// Error handled in onError
		}
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Upgrade to {targetPlanConfig.displayName}</DialogTitle>
					<DialogDescription>
						Compare your current plan with {targetPlanConfig.displayName} and
						see what you'll get.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="mb-4 p-0">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h3 className="font-semibold text-lg">
									{currentPlan.displayName}
								</h3>
								{currentPlan.price && (
									<p className="text-primary/60 text-sm">
										${currentPlan.price}/month
									</p>
								)}
							</div>
							<div className="text-right">
								<h3 className="font-semibold text-lg">
									{targetPlanConfig.displayName}
								</h3>
								{targetPlanConfig.price && (
									<p className="text-primary/60 text-sm">
										${targetPlanConfig.price}/month
									</p>
								)}
							</div>
						</div>

						<div className="space-y-1">
							<FeatureRow
								currentValue={currentPlan.features.conversations}
								label="Conversations"
								targetValue={targetPlanConfig.features.conversations}
							/>
							<FeatureRow
								currentValue={currentPlan.features.messages}
								label="Messages"
								targetValue={targetPlanConfig.features.messages}
							/>
							<FeatureRow
								currentValue={currentPlan.features.contacts}
								label="Contacts"
								targetValue={targetPlanConfig.features.contacts}
							/>
							<FeatureRow
								currentValue={currentPlan.features["conversation-retention"]}
								label="Conversation Retention"
								targetValue={
									targetPlanConfig.features["conversation-retention"]
								}
							/>
							<FeatureRow
								currentValue={currentPlan.features["team-members"]}
								label="Team Members"
								targetValue={targetPlanConfig.features["team-members"]}
							/>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isLoading}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={isLoading} onClick={handleUpgrade} type="button">
						{isLoading
							? "Redirecting..."
							: `Upgrade to ${targetPlanConfig.displayName}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
