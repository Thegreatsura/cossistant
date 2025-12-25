"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Icon from "@/components/ui/icons";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
} from "@/components/ui/layout/settings-layout";

export default function IntegrationsPage() {
	return (
		<SettingsPage>
			<SettingsHeader>Integrations</SettingsHeader>
			<PageContent className="py-6">
				<Card className="border-dashed">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CardTitle>AI Agent Integrations</CardTitle>
							<Badge variant="secondary">Coming Soon</Badge>
						</div>
						<CardDescription>
							Connect your AI agent to external services and platforms.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Icon
							className="mb-4 size-12 text-muted-foreground/50"
							name="card"
						/>
						<p className="mb-2 text-center font-medium">
							Integrations are coming soon
						</p>
						<p className="max-w-md text-center text-muted-foreground text-sm">
							Connect your AI agent to CRMs, helpdesks, e-commerce platforms,
							and other tools to provide contextual support.
						</p>
						<div className="mt-6 flex flex-wrap justify-center gap-3">
							<Badge className="py-1" variant="outline">
								Shopify
							</Badge>
							<Badge className="py-1" variant="outline">
								Stripe
							</Badge>
							<Badge className="py-1" variant="outline">
								Zendesk
							</Badge>
							<Badge className="py-1" variant="outline">
								HubSpot
							</Badge>
							<Badge className="py-1" variant="outline">
								Salesforce
							</Badge>
							<Badge className="py-1" variant="outline">
								Linear
							</Badge>
						</div>
					</CardContent>
				</Card>
			</PageContent>
		</SettingsPage>
	);
}
