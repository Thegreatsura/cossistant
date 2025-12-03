"use client";

import { useQuery } from "@tanstack/react-query";
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
	const trpc = useTRPC();

	const { data: aiAgent, isLoading } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	return (
		<SettingsPage>
			<SettingsHeader>AI Agent</SettingsHeader>
			<PageContent className="py-30">
				<SettingsRow
					description="Configure your AI assistant that automatically responds to visitor messages. When enabled, the agent will help visitors with common questions."
					title="AI Agent Configuration"
				>
					{isLoading ? (
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
					) : (
						<AIAgentForm
							initialData={aiAgent ?? null}
							websiteSlug={website.slug}
						/>
					)}
				</SettingsRow>
			</PageContent>
		</SettingsPage>
	);
}
