"use client";

import { useQuery } from "@tanstack/react-query";
import { TrainingSummarySidebar } from "@/components/ui/layout/sidebars/training-summary";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";

type TrainingLayoutProps = {
	children: React.ReactNode;
};

export default function TrainingLayout({ children }: TrainingLayoutProps) {
	const website = useWebsite();
	const trpc = useTRPC();

	// Get the AI agent for this website to pass its ID to the sidebar
	const { data: aiAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	return (
		<>
			{children}
			<TrainingSummarySidebar aiAgentId={aiAgent?.id ?? null} />
		</>
	);
}
