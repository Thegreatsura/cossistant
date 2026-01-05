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

export default function ToolsPage() {
	return (
		<SettingsPage>
			<SettingsHeader>Tools</SettingsHeader>
			<PageContent className="py-6">
				<Card className="border-dashed">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CardTitle>AI Agent Tools</CardTitle>
							<Badge variant="secondary">Coming Soon</Badge>
						</div>
						<CardDescription>
							Extend your AI agent's capabilities with custom tools and actions.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Icon
							className="mb-4 size-12 text-muted-foreground/50"
							name="cli"
						/>
						<p className="mb-2 text-center font-medium">
							Tools are coming soon
						</p>
						<p className="max-w-md text-center text-muted-foreground text-sm">
							You'll be able to give your AI agent the ability to perform
							actions like looking up orders, checking inventory, creating
							tickets, and more.
						</p>
						<div className="mt-6 grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center gap-2">
								<Icon className="size-4 text-muted-foreground" name="check" />
								<span>Custom API calls</span>
							</div>
							<div className="flex items-center gap-2">
								<Icon className="size-4 text-muted-foreground" name="check" />
								<span>Database lookups</span>
							</div>
							<div className="flex items-center gap-2">
								<Icon className="size-4 text-muted-foreground" name="check" />
								<span>Ticket creation</span>
							</div>
							<div className="flex items-center gap-2">
								<Icon className="size-4 text-muted-foreground" name="check" />
								<span>Order tracking</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</PageContent>
		</SettingsPage>
	);
}
