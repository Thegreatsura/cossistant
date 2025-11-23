"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UpgradeSuccessModal } from "@/components/plan/upgrade-success-modal";
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

	return (
		<>
			<div className="mb-6 rounded-lg border border-cossistant-orange/30 bg-cossistant-orange/5 p-4">
				<div className="flex items-center gap-2 text-cossistant-orange">
					<Sparkles className="size-4" />
					<p className="font-medium text-sm">
						Early bird launch pricing is live. Upgrade now to lock in discounted
						rates for the lifetime of your subscription.
					</p>
				</div>
			</div>
			<UpgradeSuccessModal
				onOpenChange={setIsSuccessModalOpen}
				open={isSuccessModalOpen}
				plan={planInfo.plan}
				usage={planInfo.usage}
			/>
		</>
	);
}
