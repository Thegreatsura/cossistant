"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { copyToClipboardWithMeta } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import Icon from "@/components/ui/icons";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AIAgentForm } from "./ai-agent-form";

export default function AgentsPage() {
	const website = useWebsite();
	const trpc = useTRPC();
	const [hasCopied, setHasCopied] = useState(false);

	const { data: aiAgent, isLoading } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	const handleCopyAgentId = async () => {
		if (!aiAgent?.id) {
			return;
		}

		try {
			await copyToClipboardWithMeta(aiAgent.id);
			setHasCopied(true);
			toast.success("Agent ID copied to clipboard");
			setTimeout(() => setHasCopied(false), 2000);
		} catch {
			toast.error("Failed to copy agent ID");
		}
	};

	return (
		<SettingsPage>
			<SettingsHeader>General Settings</SettingsHeader>
			<PageContent className="py-30">
				{/* Agent ID Banner */}
				{aiAgent && (
					<div className="mb-6 rounded-lg border border-primary/10 bg-background-100 px-4 py-3 dark:border-primary/5 dark:bg-background-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground text-sm">Agent ID:</span>
								<code className="rounded bg-background-200 px-2 py-0.5 font-mono text-xs dark:bg-background-300">
									{aiAgent.id}
								</code>
							</div>
							<TooltipOnHover content="Copy agent ID">
								<button
									className={cn(
										"flex size-7 items-center justify-center rounded-md transition-colors hover:bg-background-200 dark:hover:bg-background-300",
										hasCopied && "text-green-500"
									)}
									onClick={handleCopyAgentId}
									type="button"
								>
									<Icon
										className="size-4"
										name={hasCopied ? "check" : "clipboard"}
									/>
								</button>
							</TooltipOnHover>
						</div>
					</div>
				)}

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
