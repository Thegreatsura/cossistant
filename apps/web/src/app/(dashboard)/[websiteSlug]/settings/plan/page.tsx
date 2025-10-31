import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { getQueryClient, prefetch, trpc } from "@/lib/trpc/server";
import { UpgradeButton } from "./upgrade-button";

type UsageSettingsPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

function formatNumber(num: number | null): string {
	if (num === null) {
		return "Unlimited";
	}

	return num.toLocaleString();
}

function formatUsage(current: number, limit: number | null): string {
	if (limit === null) {
		return `${current.toLocaleString()} / Unlimited`;
	}

	return `${current.toLocaleString()} / ${limit.toLocaleString()}`;
}

function getUsagePercentage(current: number, limit: number | null): number {
	if (limit === null || limit === 0) {
		return 0;
	}

	return Math.min(100, Math.round((current / limit) * 100));
}

export default async function UsageSettingsPage({
	params,
}: UsageSettingsPageProps) {
	const { websiteSlug } = await params;
	await ensureWebsiteAccess(websiteSlug);

	// Prefetch plan info
	await prefetch(trpc.plan.getPlanInfo.queryOptions({ websiteSlug }), () => {
		// Handle error if needed
	});

	return (
		<SettingsPage>
			<SettingsHeader>Plan & Usage</SettingsHeader>

			<PlanInfoContent websiteSlug={websiteSlug} />
		</SettingsPage>
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
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-lg">{plan.displayName}</span>
						{plan.price && (
							<span className="text-primary/60 text-sm">
								${plan.price}/month
							</span>
						)}
					</div>
					<UpgradeButton currentPlan={plan} websiteSlug={websiteSlug} />
				</div>
			</SettingsRow>

			<SettingsRow
				description="Track your usage against plan limits"
				title="Usage & Limits"
			>
				<div className="space-y-6">
					{/* Conversations */}
					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">Conversations</span>
							<span className="text-primary/60">
								{formatUsage(usage.conversations, plan.features.conversations)}
							</span>
						</div>
						{plan.features.conversations !== null && (
							<div className="h-2 w-full overflow-hidden rounded-full bg-background-200 dark:bg-background-800">
								<div
									className="h-full bg-primary transition-all"
									style={{
										width: `${getUsagePercentage(
											usage.conversations,
											plan.features.conversations
										)}%`,
									}}
								/>
							</div>
						)}
					</div>

					{/* Messages */}
					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">Messages</span>
							<span className="text-primary/60">
								{formatUsage(usage.messages, plan.features.messages)}
							</span>
						</div>
						{plan.features.messages !== null && (
							<div className="h-2 w-full overflow-hidden rounded-full bg-background-200 dark:bg-background-800">
								<div
									className="h-full bg-primary transition-all"
									style={{
										width: `${getUsagePercentage(
											usage.messages,
											plan.features.messages
										)}%`,
									}}
								/>
							</div>
						)}
					</div>

					{/* Contacts */}
					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">Contacts</span>
							<span className="text-primary/60">
								{formatUsage(usage.contacts, plan.features.contacts)}
							</span>
						</div>
						{plan.features.contacts !== null && (
							<div className="h-2 w-full overflow-hidden rounded-full bg-background-200 dark:bg-background-800">
								<div
									className="h-full bg-primary transition-all"
									style={{
										width: `${getUsagePercentage(
											usage.contacts,
											plan.features.contacts
										)}%`,
									}}
								/>
							</div>
						)}
					</div>

					{/* Conversation Retention */}
					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">Conversation Retention</span>
							<span className="text-primary/60">
								{plan.features["conversation-retention"] === null
									? "Unlimited"
									: `${plan.features["conversation-retention"]} days`}
							</span>
						</div>
					</div>

					{/* Team Members */}
					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">Team Members</span>
							<span className="text-primary/60">
								{formatUsage(usage.teamMembers, plan.features["team-members"])}
							</span>
						</div>
						{plan.features["team-members"] !== null && (
							<div className="h-2 w-full overflow-hidden rounded-full bg-background-200 dark:bg-background-800">
								<div
									className="h-full bg-primary transition-all"
									style={{
										width: `${getUsagePercentage(
											usage.teamMembers,
											plan.features["team-members"]
										)}%`,
									}}
								/>
							</div>
						)}
					</div>
				</div>
			</SettingsRow>
		</>
	);
}
