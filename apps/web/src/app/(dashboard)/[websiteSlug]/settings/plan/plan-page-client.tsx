"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UpgradeSuccessModal } from "@/components/plan/upgrade-success-modal";
import {
	calculateDiscountedPrice,
	type DiscountInfo,
	EARLY_BIRD_DISCOUNT_ID,
	formatDiscountOffer,
	isDiscountAvailable,
} from "@/lib/discount-utils";
import { useTRPC } from "@/lib/trpc/client";

type PlanPageClientProps = {
	websiteSlug: string;
	checkoutSuccess: boolean;
	checkoutError: boolean;
};

export function PlanPageClient({
	websiteSlug,
	checkoutSuccess,
	checkoutError,
}: PlanPageClientProps) {
	const router = useRouter();
	const trpc = useTRPC();
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

	// Fetch plan info
	const { data: planInfo, refetch } = useQuery({
		...trpc.plan.getPlanInfo.queryOptions({
			websiteSlug,
		}),
	});

	// Fetch discount info
	const { data: discount } = useQuery({
		...trpc.plan.getDiscountInfo.queryOptions({
			discountId: EARLY_BIRD_DISCOUNT_ID,
		}),
	});

	useEffect(() => {
		if (checkoutSuccess) {
			// Refetch plan info to get updated data
			void refetch();
			setIsSuccessModalOpen(true);

			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete("checkout_success");
			router.replace(url.pathname + url.search);
		}
	}, [checkoutSuccess, refetch, router]);

	useEffect(() => {
		if (checkoutError) {
			toast.error(
				"There was an error processing your upgrade. Please try again or contact support if the issue persists."
			);

			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete("checkout_error");
			router.replace(url.pathname + url.search);
		}
	}, [checkoutError, router]);

	if (!planInfo) {
		return null;
	}

	const isDiscountValid = discount ? isDiscountAvailable(discount) : false;

	return (
		<>
			{/* {discount && isDiscountValid && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="font-semibold text-primary">Early Bird Discount</h3>
          </div>
          <p className="mb-2 text-primary/80">
            {formatDiscountOffer(discount)}
          </p>
          <div className="flex items-center gap-2 text-primary/70 text-sm">
            <Tag className="size-4" />
            <span>
              {discount.redemptionsLeft !== null
                ? `${discount.redemptionsLeft} of ${discount.maxRedemptions} redemptions left`
                : "Limited time offer"}
            </span>
          </div>
        </div>
      )} */}
			<UpgradeSuccessModal
				onOpenChange={setIsSuccessModalOpen}
				open={isSuccessModalOpen}
				plan={planInfo.plan}
				usage={planInfo.usage}
			/>
		</>
	);
}
