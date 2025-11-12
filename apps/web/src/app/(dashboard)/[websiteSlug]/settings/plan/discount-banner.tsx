"use client";

import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import {
	EARLY_BIRD_DISCOUNT_ID,
	formatDiscountOffer,
	isDiscountAvailable,
} from "@/lib/discount-utils";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function DiscountBanner({ className }: { className?: string }) {
	const trpc = useTRPC();

	// Fetch discount info
	const { data: discount } = useQuery({
		...trpc.plan.getDiscountInfo.queryOptions({
			discountId: EARLY_BIRD_DISCOUNT_ID,
		}),
	});

	const isDiscountValid = discount ? isDiscountAvailable(discount) : false;

	if (!(discount && isDiscountValid)) {
		return null;
	}

	return (
		<div
			className={cn(
				"group rounded-[2px] bg-cossistant-green/20 p-3 dark:bg-cossistant-green",
				className
			)}
		>
			<div className="flex items-center gap-2">
				<h4 className="font-mono font-semibold text-black text-sm">
					Early Bird Discount
				</h4>
			</div>
			<div className="flex items-center justify-between gap-2">
				<p className="font-medium font-mono text-black/90 text-sm">
					{formatDiscountOffer(discount)}
				</p>
				<div className="flex items-center gap-2 font-mono text-black/70 text-xs">
					<Tag className="size-3" />
					<span>
						{discount.redemptionsLeft !== null
							? `${discount.redemptionsLeft} of ${discount.maxRedemptions} left`
							: "Limited time offer"}
					</span>
				</div>
			</div>
		</div>
	);
}
