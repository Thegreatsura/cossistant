"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BlurredAgentsSidebar } from "@/components/ui/layout/sidebars/blurred-agents-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { AgentOnboardingFlow } from "./agent-onboarding-flow";

export default function AgentCreatePage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();

	// Check if an agent already exists
	const { data: existingAgent, isLoading } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Redirect to agents page if an agent already exists
	useEffect(() => {
		if (!isLoading && existingAgent) {
			router.replace(`/${website.slug}/agents`);
		}
	}, [existingAgent, isLoading, router, website.slug]);

	// Show loading state while checking
	if (isLoading) {
		return (
			<div className="flex h-screen w-full">
				<BlurredAgentsSidebar />
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-2xl space-y-6 px-6">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
						<div className="space-y-4 pt-8">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-32 w-full" />
						</div>
					</div>
				</div>
				<div className="hidden w-[240px] shrink-0 lg:block" />
			</div>
		);
	}

	// Don't render if agent exists (we'll redirect)
	if (existingAgent) {
		return null;
	}

	return (
		<div className="flex h-screen w-full">
			{/* Main Content - Centered Form */}
			<ScrollArea
				className="flex flex-1 flex-col"
				orientation="vertical"
				scrollMask
			>
				<AgentOnboardingFlow />
			</ScrollArea>
		</div>
	);
}
