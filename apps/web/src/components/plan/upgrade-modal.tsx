"use client";

import {
	type FeatureValue,
	PLAN_CONFIG,
	type PlanName,
} from "@api/lib/plans/config";
import type { RouterOutputs } from "@cossistant/api/types";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

type PlanInfo = RouterOutputs["plan"]["getPlanInfo"];

type UpgradeModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentPlan: PlanInfo["plan"];
	initialPlanName: PlanName;
	websiteSlug: string;
};

const PLAN_SEQUENCE: PlanName[] = ["free", "hobby", "pro"];
const PLAN_DESCRIPTIONS: Record<PlanName, string> = {
	free: "Perfect for getting started",
	hobby: "For growing teams shipping faster",
	pro: "For teams that need advanced controls",
};

function formatFeatureValue(value: number | null): string {
	if (value === null) {
		return "Unlimited";
	}
	return value.toLocaleString();
}

function PlanPriceDisplay({
	price,
	className,
	align = "end",
}: {
	price?: number;
	className?: string;
	align?: "start" | "end";
}) {
	const alignmentClasses =
		align === "start" ? "items-start text-left" : "items-end text-right";

	return (
		<div
			className={cn(
				"flex min-h-[32px] flex-col justify-center",
				alignmentClasses,
				className
			)}
		>
			{price ? (
				<p className="text-primary/70 text-sm">${price}/month</p>
			) : (
				<p className="text-primary/70 text-sm">Free</p>
			)}
		</div>
	);
}

function FeatureRow({
	label,
	currentValue,
	targetValue,
	valueUnitLabel,
}: {
	label: string;
	currentValue: number | null;
	targetValue: number | null;
	valueUnitLabel?: string;
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
		<div className="flex items-center justify-between border-primary/5 border-b py-2 last:border-0">
			<span className="font-medium text-sm">{label}</span>
			<div className="flex items-center gap-3">
				<span
					className={`text-sm ${isSame ? "text-primary/60" : "text-primary/40"}`}
				>
					{formatFeatureValue(currentValue)}
					{valueUnitLabel && ` ${valueUnitLabel}`}
				</span>
				<ArrowRight className="mx-2 size-4 text-primary/40" />
				<span
					className={`min-w-[100px] text-right font-semibold text-sm ${upgraded ? "text-primary" : ""}`}
				>
					{formatFeatureValue(targetValue)}
					{valueUnitLabel && ` ${valueUnitLabel}`}
				</span>
				{upgraded && <Check className="size-4 text-primary" />}
			</div>
		</div>
	);
}

function toNumericFeatureValue(value: FeatureValue): number | null {
	if (typeof value === "number" || value === null) {
		return value;
	}

	// Boolean feature flags shouldn't reach numeric rows; fall back to 0/Unlimited.
	return value ? null : 0;
}

export function UpgradeModal({
	open,
	onOpenChange,
	currentPlan,
	initialPlanName,
	websiteSlug,
}: UpgradeModalProps) {
	const trpc = useTRPC();
	const [selectedPlanName, setSelectedPlanName] =
		useState<PlanName>(initialPlanName);

	useEffect(() => {
		if (open) {
			setSelectedPlanName(initialPlanName);
		}
	}, [initialPlanName, open]);

	const currentPlanConfig = PLAN_CONFIG[currentPlan.name] ?? PLAN_CONFIG.free;
	const selectedPlanConfig = PLAN_CONFIG[selectedPlanName] ?? PLAN_CONFIG.free;

	const currentIndex = PLAN_SEQUENCE.indexOf(currentPlan.name);
	const selectedIndex = PLAN_SEQUENCE.indexOf(selectedPlanName);
	const isSamePlan = currentPlan.name === selectedPlanName;
	const isDowngrade =
		currentIndex !== -1 && selectedIndex !== -1 && selectedIndex < currentIndex;

	const actionLabel = isSamePlan
		? "You're already on this plan"
		: `${isDowngrade ? "Downgrade" : "Upgrade"} to ${selectedPlanConfig.displayName}`;

	const billingHref = `/${websiteSlug}/billing`;
	const hasPolarProduct = Boolean(selectedPlanConfig.polarProductId);

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

	const handlePlanChange = async () => {
		if (isSamePlan || !hasPolarProduct) {
			return;
		}
		try {
			await createCheckout({
				websiteSlug,
				targetPlan: selectedPlanName,
			});
		} catch (error) {
			// Error handled in onError
		}
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-[640px]">
				<DialogHeader>
					<DialogTitle>Change plan</DialogTitle>
					<DialogDescription>
						Compare plans side-by-side and select the one that fits your team.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div>
						<p className="mb-2 font-semibold text-muted-foreground text-sm">
							Choose a plan
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							{PLAN_SEQUENCE.map((planName) => {
								const plan = PLAN_CONFIG[planName];
								const isSelected = selectedPlanName === planName;
								const isCurrent = currentPlan.name === planName;

								return (
									<button
										className={cn(
											"rounded border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											isSelected
												? "border-primary bg-primary/5"
												: "border-primary/10 hover:border-primary/40"
										)}
										key={plan.name}
										onClick={() => setSelectedPlanName(planName)}
										type="button"
									>
										<div className="flex items-start justify-between gap-4">
											<div>
												<p className="font-semibold">{plan.displayName}</p>
												{isCurrent && (
													<span className="text-primary/60 text-xs">
														Current plan
													</span>
												)}
											</div>
											<PlanPriceDisplay align="end" price={plan.price} />
										</div>
										<p className="mt-2 text-muted-foreground text-xs">
											{PLAN_DESCRIPTIONS[planName]}
										</p>
									</button>
								);
							})}
						</div>
					</div>

					<div className="rounded border border-primary/10 p-4">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p className="text-muted-foreground text-xs uppercase tracking-wide">
									Current plan
								</p>
								<h3 className="font-semibold text-lg">
									{currentPlanConfig.displayName}
								</h3>
								<PlanPriceDisplay align="start" price={currentPlan.price} />
							</div>
							<div className="text-right">
								<p className="text-muted-foreground text-xs uppercase tracking-wide">
									{isSamePlan
										? "Selected plan"
										: isDowngrade
											? "Downgrade to"
											: "Upgrade to"}
								</p>
								<h3 className="font-semibold text-lg">
									{selectedPlanConfig.displayName}
								</h3>
								<PlanPriceDisplay
									align="end"
									price={selectedPlanConfig.price}
								/>
							</div>
						</div>

						<div className="mt-6 space-y-1">
							<FeatureRow
								currentValue={toNumericFeatureValue(
									currentPlan.features.conversations
								)}
								label="Conversations"
								targetValue={toNumericFeatureValue(
									selectedPlanConfig.features.conversations
								)}
							/>
							<FeatureRow
								currentValue={toNumericFeatureValue(
									currentPlan.features.messages
								)}
								label="Messages"
								targetValue={toNumericFeatureValue(
									selectedPlanConfig.features.messages
								)}
							/>
							<FeatureRow
								currentValue={toNumericFeatureValue(
									currentPlan.features.contacts
								)}
								label="Contacts"
								targetValue={toNumericFeatureValue(
									selectedPlanConfig.features.contacts
								)}
							/>
							<FeatureRow
								currentValue={toNumericFeatureValue(
									currentPlan.features["conversation-retention"]
								)}
								label="Conversation Retention"
								targetValue={toNumericFeatureValue(
									selectedPlanConfig.features["conversation-retention"]
								)}
								valueUnitLabel="days"
							/>
							<FeatureRow
								currentValue={toNumericFeatureValue(
									currentPlan.features["team-members"]
								)}
								label="Team Members"
								targetValue={toNumericFeatureValue(
									selectedPlanConfig.features["team-members"]
								)}
							/>
						</div>
					</div>
				</div>

				<DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Button asChild variant="outline">
						<Link href={billingHref}>View billing</Link>
					</Button>
					<div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
						{!(hasPolarProduct || isSamePlan) && (
							<p className="text-center text-muted-foreground text-xs sm:text-right">
								Manage this change from the billing portal.
							</p>
						)}
						<Button
							disabled={isLoading}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isLoading || isSamePlan || !hasPolarProduct}
							onClick={handlePlanChange}
							type="button"
						>
							{isLoading ? "Redirecting..." : actionLabel}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
