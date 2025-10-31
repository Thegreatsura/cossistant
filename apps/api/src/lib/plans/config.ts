import { env } from "@api/env";

export type FeatureKey =
	| "conversations"
	| "messages"
	| "contacts"
	| "conversation-retention"
	| "team-members";

export type PlanName = "free" | "hobby";

export type FeatureConfig = {
	key: FeatureKey;
	name: string;
	description: string;
};

export type PlanConfig = {
	name: PlanName;
	displayName: string;
	price?: number; // USD per month
	polarProductId?: string; // For mapping to Polar products
	polarProductName?: string; // Alternative: map by name
	features: Record<FeatureKey, number | null>; // null = unlimited, number = limit
};

export const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
	conversations: {
		key: "conversations",
		name: "Conversations",
		description: "Number of conversations that can be created",
	},
	messages: {
		key: "messages",
		name: "Messages",
		description: "Number of messages allowed",
	},
	contacts: {
		key: "contacts",
		name: "Contacts",
		description: "Number of contacts that can be stored",
	},
	"conversation-retention": {
		key: "conversation-retention",
		name: "Conversation Retention",
		description: "Number of days conversations are retained",
	},
	"team-members": {
		key: "team-members",
		name: "Team Members",
		description: "Number of team members allowed",
	},
};

// Polar product IDs by environment
const POLAR_PRODUCT_IDS: Record<
	PlanName,
	{ sandbox: string; production?: string }
> = {
	free: {
		sandbox: "", // Free plan doesn't have a product
		production: "",
	},
	hobby: {
		sandbox: "b060ff1e-c2dd-4c02-a3e4-395d7cce84a0",
		production: "758ff687-1254-422f-9b4a-b23d39c6b47e",
	},
};

function getPolarProductId(planName: PlanName): string | undefined {
	const isProduction = env.NODE_ENV === "production";
	const productIds = POLAR_PRODUCT_IDS[planName];
	return isProduction ? productIds.production : productIds.sandbox;
}

export const PLAN_CONFIG: Record<PlanName, PlanConfig> = {
	free: {
		name: "free",
		displayName: "Free",
		features: {
			conversations: 200, // Limited conversations
			messages: 500, // Limited messages
			contacts: 100, // Limited contacts
			"conversation-retention": 30, // Days - conversations retained for 30 days
			"team-members": 2, // Limited team members
		},
	},
	hobby: {
		name: "hobby",
		displayName: "Hobby",
		price: 29,
		polarProductId: getPolarProductId("hobby"),
		polarProductName: "Hobby", // Map to Polar product name (can be overridden via env)
		features: {
			conversations: null, // Unlimited
			messages: null, // Unlimited
			contacts: 2000,
			"conversation-retention": null, // Full retention (unlimited)
			"team-members": 4, // Limited team members
		},
	},
};

/**
 * Get plan configuration by name
 */
export function getPlanConfig(planName: PlanName): PlanConfig {
	return PLAN_CONFIG[planName];
}

/**
 * Get default plan (free)
 */
export function getDefaultPlan(): PlanConfig {
	return PLAN_CONFIG.free;
}

/**
 * Map Polar product name/ID to internal plan name
 */
export function mapPolarProductToPlan(
	polarProductName?: string,
	polarProductId?: string
): PlanName | null {
	if (!(polarProductName || polarProductId)) {
		return null;
	}

	// Check by product name first
	for (const [planName, config] of Object.entries(PLAN_CONFIG)) {
		if (config.polarProductName === polarProductName) {
			return planName as PlanName;
		}
		if (config.polarProductId === polarProductId) {
			return planName as PlanName;
		}
	}

	return null;
}
