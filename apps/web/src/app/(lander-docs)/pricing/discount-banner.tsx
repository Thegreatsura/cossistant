import { getDiscountInfo } from "@api/lib/plans/discount";
import { Tag } from "lucide-react";
import { unstable_cache } from "next/cache";
import {
	EARLY_BIRD_DISCOUNT_ID,
	formatDiscountOffer,
	isDiscountAvailable,
} from "@/lib/discount-utils";
import { getQueryClient, trpc } from "@/lib/trpc/server";
import { cn } from "@/lib/utils";

const getCachedDiscount = unstable_cache(
	async () => {
		const discountId = EARLY_BIRD_DISCOUNT_ID;

		try {
			const discount = await getDiscountInfo(discountId);
			return discount;
		} catch (error) {
			return null;
		}
	},
	["public-discount-info"],
	{ revalidate: 3600, tags: ["discount-info"] }
);

export async function DiscountBanner({ className }: { className?: string }) {
	const discount = await getCachedDiscount();
	const isDiscountValid = discount ? isDiscountAvailable(discount) : false;

	if (!(discount && isDiscountValid)) {
		return null;
	}

	return (
		<div
			className={cn(
				"mx-auto mt-12 max-w-4xl rounded-xl border border-primary/20 bg-primary/5 p-6 text-center",
				className
			)}
		>
			<div className="flex flex-col items-center justify-center gap-2">
				<h3 className="flex items-center gap-2 font-semibold text-primary text-xl">
					<Tag className="size-5" />
					Launch Special: {discount.name}
				</h3>
				<p className="text-muted-foreground">
					Get{" "}
					<span className="font-medium text-foreground">
						{formatDiscountOffer(discount)}
					</span>
					!
					{discount.redemptionsLeft !== null && (
						<span className="ml-1 text-sm">
							({discount.redemptionsLeft} spots left)
						</span>
					)}
				</p>
			</div>
		</div>
	);
}
