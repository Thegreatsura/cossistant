"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { AgentOnboardingFlow } from "./agent-onboarding-flow";

export default function AgentCreatePage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();

	// Data is pre-fetched in the layout, so it will be available immediately
	const { data: existingAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Redirect to agents page if an agent already exists
	useEffect(() => {
		if (existingAgent) {
			router.replace(`/${website.slug}/agents`);
		}
	}, [existingAgent, router, website.slug]);

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
