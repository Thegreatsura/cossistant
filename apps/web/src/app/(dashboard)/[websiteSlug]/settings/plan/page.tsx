import Link from "next/link";
import { UsageBar } from "@/components/plan/usage-bar";
import { Button } from "@/components/ui/button";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { getQueryClient, prefetch, trpc } from "@/lib/trpc/server";
import { DiscountBanner } from "./discount-banner";
import { PlanPageClient } from "./plan-page-client";
import { UpgradeButton } from "./upgrade-button";

type UsageSettingsPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
	searchParams: Promise<{
		checkout_success?: string;
		checkout_error?: string;
	}>;
};

export default async function UsageSettingsPage({
	params,
	searchParams,
}: UsageSettingsPageProps) {
	const { websiteSlug } = await params;
	const { checkout_success, checkout_error } = await searchParams;

	await ensureWebsiteAccess(websiteSlug);

	// Prefetch plan info
	await prefetch(trpc.plan.getPlanInfo.queryOptions({ websiteSlug }), () => {
		// Handle error if needed
	});

	return (
		<>
			<PlanPageClient
				checkoutError={checkout_error === "true"}
				checkoutSuccess={checkout_success === "true"}
				websiteSlug={websiteSlug}
			/>
			<SettingsPage className="py-30">
				<SettingsHeader>Plan & Usage</SettingsHeader>

				<PlanInfoContent websiteSlug={websiteSlug} />
			</SettingsPage>
		</>
	);
}

async function PlanInfoContent({ websiteSlug }: { websiteSlug: string }) {
	const queryClient = getQueryClient();
	const planInfo = await queryClient.fetchQuery(
		trpc.plan.getPlanInfo.queryOptions({ websiteSlug })
	);

	const { plan, usage } = planInfo;

	return (
		<>
			<SettingsRow
				description={`You are currently on the ${plan.displayName} plan${
					plan.price ? ` ($${plan.price}/month)` : ""
				}.`}
				title="Current Plan"
			>
				<DiscountBanner className="mx-2 mt-2 mb-10" />
				<div className="flex flex-wrap items-center justify-between gap-4 p-2 pl-4">
					<div className="flex items-center gap-2">
						<span className="font-medium text-lg">{plan.displayName}</span>
						{plan.price && (
							<span className="text-primary/60 text-sm">
								${plan.price}/month
							</span>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<UpgradeButton currentPlan={plan} websiteSlug={websiteSlug} />
						<Button asChild variant="outline">
							<Link href={`/${websiteSlug}/billing`}>View billing</Link>
						</Button>
					</div>
				</div>
			</SettingsRow>

			<SettingsRow
				description="Track your usage against plan limits"
				title="Usage & Limits"
			>
				<div className="space-y-6 p-4">
					{/* Conversations */}
					<UsageBar
						current={usage.conversations}
						label="Conversations"
						limit={plan.features.conversations}
					/>

					{/* Messages */}
					<UsageBar
						current={usage.messages}
						label="Messages"
						limit={plan.features.messages}
					/>

					{/* Contacts */}
					<UsageBar
						current={usage.contacts}
						label="Contacts"
						limit={plan.features.contacts}
					/>

					{/* Team Members */}
					<UsageBar
						current={Math.max(1, usage.teamMembers)}
						formatValue={(current, limit) => {
							const othersCount = Math.max(0, current - 1);
							const displayText = othersCount === 0 ? "Alone" : othersCount + 1;

							if (limit === null) {
								return `${displayText} / Unlimited`;
							}

							return `${displayText} / ${limit.toLocaleString()}`;
						}}
						label="Team Members"
						limit={plan.features["team-members"]}
					/>

					{/* Conversation Retention - at the bottom */}
					<UsageBar
						current={plan.features["conversation-retention"] ?? 0}
						formatValue={(current, limit) => {
							if (limit === null && current === 0) {
								return "Unlimited";
							}
							return `Auto delete after ${current} days`;
						}}
						label="Data retention"
						limit={null}
						showBar={false}
					/>
				</div>
			</SettingsRow>
		</>
	);
}
