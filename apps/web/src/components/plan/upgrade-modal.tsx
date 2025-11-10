"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, Tag } from "lucide-react";
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
import {
	calculateDiscountedPrice,
	EARLY_BIRD_DISCOUNT_ID,
	formatDiscountOffer,
	isDiscountAvailable,
} from "@/lib/discount-utils";
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
		<div className="flex items-center justify-between border-primary/10 border-b py-2 last:border-0">
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

export function UpgradeModal({
	open,
	onOpenChange,
	currentPlan,
	targetPlanName,
	websiteSlug,
}: UpgradeModalProps) {
	const trpc = useTRPC();

	// Fetch discount info
	const { data: discount } = useQuery({
		...trpc.plan.getDiscountInfo.queryOptions({
			discountId: EARLY_BIRD_DISCOUNT_ID,
		}),
	});

	const isDiscountValid = discount ? isDiscountAvailable(discount) : false;

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

	const discountedPrice =
		targetPlanConfig.price && discount && isDiscountValid
			? calculateDiscountedPrice(targetPlanConfig.price, discount)
			: targetPlanConfig.price;

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
				discountId: isDiscountValid ? EARLY_BIRD_DISCOUNT_ID : undefined,
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
					{/* Discount banner with holographic effect */}
					{discount && isDiscountValid && (
						<div className="group relative mb-10 overflow-hidden rounded-lg border border-transparent bg-cossistant-green p-px">
							{/* Inner card content */}
							<div className="relative rounded-lg border border-primary/10 bg-linear-to-br from-primary/5 via-primary/8 to-primary/5 p-4 backdrop-blur-sm">
								{/* Shimmer effect overlay */}
								<div className="-translate-x-full absolute inset-0 animate-shimmer-slow bg-linear-to-r from-transparent via-cossistant-pink/5 to-transparent" />

								<div className="relative z-10 flex flex-col gap-4">
									<div className="flex items-center gap-2">
										<h4 className="font-semibold text-primary-foreground text-sm">
											Early Bird Discount
										</h4>
									</div>
									<div className="flex items-center justify-between gap-2">
										<p className="font-medium font-mono text-primary-foreground/90 text-sm">
											{formatDiscountOffer(discount)}
										</p>
										<div className="flex items-center gap-2 font-mono text-primary-foreground/70 text-xs">
											<Tag className="size-3" />
											<span>
												{discount.redemptionsLeft !== null
													? `${discount.redemptionsLeft} of ${discount.maxRedemptions} left`
													: "Limited time offer"}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
					<div className="mb-4 p-0">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<h3 className="font-semibold text-lg">
									{currentPlan.displayName}
								</h3>
								{currentPlan.price ? (
									<p className="text-base text-primary/60">
										${currentPlan.price}/month
									</p>
								) : (
									<p className="mb-6 text-primary/60 text-sm">–</p>
								)}
							</div>
							<div className="text-right">
								<h3 className="font-semibold text-base">
									{targetPlanConfig.displayName}
								</h3>
								{targetPlanConfig.price && (
									<div className="flex flex-col items-end">
										{discount && isDiscountValid ? (
											<>
												<p className="text-lg text-primary/40 line-through">
													${targetPlanConfig.price}/month
												</p>
												<p className="font-semibold text-lg text-primary">
													${discountedPrice}/month
												</p>
											</>
										) : (
											<p className="text-primary/60 text-sm">
												${targetPlanConfig.price}/month
											</p>
										)}
									</div>
								)}
							</div>
						</div>

						<div className="mt-10 space-y-1">
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
								valueUnitLabel="days"
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
