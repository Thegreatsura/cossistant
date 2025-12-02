import type { website } from "@api/db/schema";
import {
	type FeatureKey,
	getDefaultPlan,
	getPlanConfig,
	type PlanName,
} from "./config";
import {
	getCustomerStateByOrganizationId,
	getPlanFromCustomerState,
	getSubscriptionForWebsite,
} from "./polar";

type Website = typeof website.$inferSelect;

export type PlanInfo = {
	planName: PlanName;
	displayName: string;
	price?: number;
	features: Record<FeatureKey, number | null>;
};

/**
 * Check if a website can use a specific feature
 */
export async function canUse(
	featureKey: FeatureKey,
	_website: Website
): Promise<boolean> {
	const planInfo = await getPlanForWebsite(_website);

	if (!planInfo) {
		return false;
	}

	const featureLimit = planInfo.features[featureKey];

	// null means unlimited, so return true
	if (featureLimit === null) {
		return true;
	}

	// If there's a limit, we need to check current usage
	// For now, we'll assume the limit check is done elsewhere
	// This function just checks if the plan allows the feature
	return true;
}

/**
 * Get plan information for a website
 * Returns the plan name, display name, price, and feature limits
 * Defaults to free plan if no subscription exists
 */
export async function getPlanForWebsite(_website: Website): Promise<PlanInfo> {
	try {
		// Get customer state from Polar using organization ID
		const customerState = await getCustomerStateByOrganizationId(
			_website.organizationId
		);

		// Find subscription for this specific website
		const websiteSubscription = getSubscriptionForWebsite(
			customerState,
			_website.id
		);

		let planName: PlanName | null = null;

		if (websiteSubscription) {
			// If we have a website-specific subscription, get plan from it
			// Create a temporary customer state with just this subscription
			const subscriptionCustomerState = {
				customerId: customerState?.customerId ?? "",
				activeSubscriptions: [websiteSubscription],
				grantedBenefits: customerState?.grantedBenefits ?? [],
			};
			planName = await getPlanFromCustomerState(subscriptionCustomerState);
		}
		// No fallback to organization-level subscriptions - each website must have its own subscription
		// If no website-specific subscription found, planName stays null and defaults to "free" below

		// If no plan found, default to free
		const finalPlanName: PlanName = planName ?? "free";

		// Get plan configuration
		const planConfig = getPlanConfig(finalPlanName);

		return {
			planName: finalPlanName,
			displayName: planConfig.displayName,
			price: planConfig.price,
			features: planConfig.features,
		};
	} catch (error) {
		console.error("Error getting plan for website:", error);

		// On error, default to free plan
		const defaultPlan = getDefaultPlan();

		return {
			planName: "free",
			displayName: defaultPlan.displayName,
			price: defaultPlan.price,
			features: defaultPlan.features,
		};
	}
}
