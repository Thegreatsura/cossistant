"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { AIAgentForm } from "./ai-agent-form";

export default function AgentsPage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();

	const { data: aiAgent, isLoading } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Redirect to create page if no agent exists
	useEffect(() => {
		// biome-ignore lint/complexity/useSimplifiedLogicExpression: we want to redirect if no agent exists
		if (!isLoading && !aiAgent) {
			router.replace(`/${website.slug}/agents/create`);
		}
	}, [aiAgent, isLoading, router, website.slug]);

	// Show loading or nothing while redirecting
	if (isLoading || !aiAgent) {
		return (
			<SettingsPage>
				<SettingsHeader>General Settings</SettingsHeader>
				<PageContent className="py-30">
					<SettingsRow
						description="Configure your AI assistant that automatically responds to visitor messages."
						title="AI Agent Configuration"
					>
						<div className="space-y-6 px-4 py-6">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-32 w-full" />
							<div className="grid grid-cols-2 gap-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
					</SettingsRow>
				</PageContent>
			</SettingsPage>
		);
	}

	return (
		<SettingsPage>
			<SettingsHeader>General Settings</SettingsHeader>
			<PageContent className="py-30">
				<SettingsRow
					description="Configure your AI assistant that automatically responds to visitor messages. When enabled, the agent will help visitors with common questions."
					title="AI Agent Configuration"
				>
					<AIAgentForm
						initialData={aiAgent}
						websiteName={website.name}
						websiteSlug={website.slug}
					/>
				</SettingsRow>
			</PageContent>
		</SettingsPage>
	);
}
