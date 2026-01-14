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

export default function FaqPage() {
	return (
		<SettingsPage>
			<SettingsHeader>FAQ</SettingsHeader>
			<PageContent className="py-6">
				<Card className="border-dashed">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CardTitle>Frequently Asked Questions</CardTitle>
							<Badge variant="secondary">Coming Soon</Badge>
						</div>
						<CardDescription>
							Add frequently asked questions and answers to train your AI agent
							on common customer inquiries.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Icon
							className="mb-4 size-12 text-muted-foreground/50"
							name="help"
						/>
						<p className="mb-2 text-center font-medium">
							FAQ management is coming soon
						</p>
						<p className="max-w-md text-center text-muted-foreground text-sm">
							You'll be able to create and organize FAQs that your AI agent can
							use to provide quick, accurate answers to common questions from
							your visitors.
						</p>
					</CardContent>
				</Card>
			</PageContent>
		</SettingsPage>
	);
}
