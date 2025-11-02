import polarClient from "@api/lib/polar";
import type { PlanName } from "./config";
import { mapPolarProductToPlan } from "./config";

export type CustomerState = {
	customerId: string;
	activeSubscriptions: Array<{
		id: string;
		productId: string;
		productName?: string;
		status: string;
		metadata?: Record<string, unknown>;
	}>;
	grantedBenefits: Array<{
		id: string;
		benefitId: string;
		benefitType: string;
	}>;
};

/**
 * Get customer by organization ID (using external ID)
 */
export async function getCustomerByOrganizationId(
	organizationId: string
): Promise<{ id: string } | null> {
	try {
		const customer = await polarClient.customers.getExternal({
			externalId: organizationId,
		});

		if (!customer) {
			return null;
		}

		return { id: customer.id };
	} catch (error) {
		console.error("Error getting customer by organization ID:", error);
		return null;
	}
}

/**
 * @deprecated Use getCustomerByOrganizationId instead
 * Get customer by website ID (using external ID)
 * Kept for backward compatibility during migration
 */
export async function getCustomerByWebsiteId(
	websiteId: string
): Promise<{ id: string } | null> {
	return getCustomerByOrganizationId(websiteId);
}

/**
 * Get customer state from Polar API
 */
export async function getCustomerState(
	customerId: string
): Promise<CustomerState | null> {
	try {
		const state = await polarClient.customers.getState({
			id: customerId,
		});

		if (!state) {
			return null;
		}

		return {
			customerId: state.id,
			activeSubscriptions:
				state.activeSubscriptions?.map((sub) => ({
					id: sub.id,
					productId: sub.productId,
					productName: undefined, // Product name not directly in subscription, would need to fetch product
					status: sub.status,
					metadata: sub.metadata,
				})) ?? [],
			grantedBenefits:
				state.grantedBenefits?.map((benefit) => ({
					id: benefit.id,
					benefitId: benefit.benefitId,
					benefitType: benefit.benefitType,
				})) ?? [],
		};
	} catch (error) {
		console.error("Error getting customer state:", error);
		return null;
	}
}

/**
 * Get customer state by organization ID
 * This is a convenience function that combines getCustomerByOrganizationId and getCustomerState
 */
export async function getCustomerStateByOrganizationId(
	organizationId: string
): Promise<CustomerState | null> {
	const customer = await getCustomerByOrganizationId(organizationId);

	if (!customer) {
		return null;
	}

	return getCustomerState(customer.id);
}

/**
 * Get subscription for a specific website from customer state
 * Filters subscriptions by metadata containing websiteId
 */
export function getSubscriptionForWebsite(
	customerState: CustomerState | null,
	websiteId: string
): CustomerState["activeSubscriptions"][number] | null {
	if (!customerState) {
		return null;
	}

	// Find subscription with matching websiteId in metadata
	const subscription = customerState.activeSubscriptions.find((sub) => {
		if (!sub.metadata || typeof sub.metadata !== "object") {
			return false;
		}

		// Check if metadata.websiteId matches
		return "websiteId" in sub.metadata && sub.metadata.websiteId === websiteId;
	});

	return subscription ?? null;
}

/**
 * @deprecated Use getCustomerStateByOrganizationId instead
 * Get customer state by external ID (website ID)
 * Kept for backward compatibility during migration
 */
export async function getCustomerStateByWebsiteId(
	websiteId: string
): Promise<CustomerState | null> {
	return getCustomerStateByOrganizationId(websiteId);
}

/**
 * Get product details from Polar to map to plan
 * We need the product name/ID to map to our internal plan
 */
export async function getProductDetails(productId: string): Promise<{
	id: string;
	name: string;
} | null> {
	try {
		const product = await polarClient.products.get({ id: productId });

		if (!product) {
			return null;
		}

		return {
			id: product.id,
			name: product.name,
		};
	} catch (error) {
		console.error("Error getting product details:", error);
		return null;
	}
}

/**
 * Determine plan from customer state
 * Returns the plan name based on active subscriptions, or null if no active subscription
 */
export async function getPlanFromCustomerState(
	customerState: CustomerState | null
): Promise<PlanName | null> {
	if (!customerState) {
		return null;
	}

	// Get the first active subscription
	const activeSubscription = customerState.activeSubscriptions.find(
		(sub) => sub.status === "active"
	);

	if (!activeSubscription) {
		return null;
	}

	// Get product details to map to plan
	const product = await getProductDetails(activeSubscription.productId);

	if (!product) {
		return null;
	}

	// Map Polar product to internal plan
	const planName = mapPolarProductToPlan(product.name, product.id);

	return planName;
}
