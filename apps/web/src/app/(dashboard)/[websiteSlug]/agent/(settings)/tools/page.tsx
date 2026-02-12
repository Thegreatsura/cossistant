"use client";

import type { GetCapabilitiesStudioResponse } from "@cossistant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
	buildBehaviorSettingsPatch,
	buildToolStudioSections,
} from "@/components/agents/skills/tools-studio-utils";
import { Badge } from "@/components/ui/badge";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";

const TOOL_CATEGORY_LABELS: Record<
	GetCapabilitiesStudioResponse["tools"][number]["category"],
	string
> = {
	system: "System",
	messaging: "Messaging",
	action: "Action",
	context: "Context",
	analysis: "Analysis",
};

export default function ToolsPage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: aiAgent, isLoading: isLoadingAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	const {
		data: studio,
		isLoading: isLoadingStudio,
		isError: isStudioError,
	} = useQuery({
		...trpc.aiAgent.getCapabilitiesStudio.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgent?.id ?? "",
		}),
		enabled: Boolean(aiAgent?.id),
	});

	useEffect(() => {
		if (!(isLoadingAgent || aiAgent)) {
			router.replace(`/${website.slug}/agent/create`);
		}
	}, [aiAgent, isLoadingAgent, router, website.slug]);

	const invalidateStudio = async () => {
		if (!aiAgent) {
			return;
		}

		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.aiAgent.getCapabilitiesStudio.queryKey({
					websiteSlug: website.slug,
					aiAgentId: aiAgent.id,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.aiAgent.getBehaviorSettings.queryKey({
					websiteSlug: website.slug,
				}),
			}),
		]);
	};

	const updateBehaviorMutation = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const toolSections = useMemo(
		() => buildToolStudioSections(studio?.tools ?? []),
		[studio?.tools]
	);

	if (!aiAgent || isLoadingAgent) {
		return null;
	}

	const handleToggleTool = async (
		tool: GetCapabilitiesStudioResponse["tools"][number],
		enabled: boolean
	) => {
		if (!tool.behaviorSettingKey) {
			return;
		}

		await updateBehaviorMutation.mutateAsync({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			settings: buildBehaviorSettingsPatch(tool.behaviorSettingKey, enabled),
		});
	};

	if (isLoadingStudio) {
		return (
			<SettingsPage>
				<SettingsHeader>Tools</SettingsHeader>
				<PageContent className="py-30">
					<SettingsRow description="Loading tools..." title="Tools">
						<div className="space-y-3 p-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					</SettingsRow>
				</PageContent>
			</SettingsPage>
		);
	}

	if (isStudioError || !studio) {
		return (
			<SettingsPage>
				<SettingsHeader>Tools</SettingsHeader>
				<PageContent className="py-30">
					<div className="p-6 text-center text-destructive">
						Failed to load tools.
					</div>
				</PageContent>
			</SettingsPage>
		);
	}

	return (
		<SettingsPage>
			<SettingsHeader>Tools</SettingsHeader>
			<PageContent className="py-30">
				<SettingsRow
					description="Review always-on defaults, manage optional tools, and track custom tool availability."
					title="Tools"
				>
					<div className="space-y-8 p-4">
						<section className="space-y-3">
							<div className="space-y-1">
								<h3 className="font-medium text-sm">
									Default Tools (Always On)
								</h3>
								<p className="text-muted-foreground text-xs">
									Mandatory runtime tools that cannot be disabled.
								</p>
							</div>
							<div className="space-y-3">
								{toolSections.defaultTools.length === 0 ? (
									<div className="rounded-md border border-border/60 border-dashed p-3">
										<p className="font-medium text-sm">
											No mandatory tools configured.
										</p>
									</div>
								) : (
									toolSections.defaultTools.map((tool) => (
										<div
											className="flex items-start justify-between gap-4 rounded-md border border-border/60 p-3"
											key={tool.id}
										>
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<p className="font-medium text-sm">{tool.label}</p>
													<Badge variant="secondary">Required</Badge>
													<Badge variant="outline">
														{TOOL_CATEGORY_LABELS[tool.category]}
													</Badge>
												</div>
												<p className="text-muted-foreground text-xs">
													{tool.description}
												</p>
											</div>
											<p className="pt-1 text-muted-foreground text-xs">
												Always on
											</p>
										</div>
									))
								)}
							</div>
						</section>

						<section className="space-y-3">
							<div className="space-y-1">
								<h3 className="font-medium text-sm">Optional Tools</h3>
								<p className="text-muted-foreground text-xs">
									Enable only the optional actions and analyses your agent
									should run.
								</p>
							</div>
							<div className="space-y-3">
								{toolSections.optionalTools.length === 0 ? (
									<div className="rounded-md border border-border/60 border-dashed p-3">
										<p className="font-medium text-sm">
											No optional tools available.
										</p>
									</div>
								) : (
									toolSections.optionalTools.map((tool) => (
										<div
											className="flex items-start justify-between gap-4 rounded-md border border-border/60 p-3"
											key={tool.id}
										>
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<p className="font-medium text-sm">{tool.label}</p>
													<Badge variant="outline">
														{TOOL_CATEGORY_LABELS[tool.category]}
													</Badge>
												</div>
												<p className="text-muted-foreground text-xs">
													{tool.description}
												</p>
											</div>
											<Switch
												aria-label={`Toggle ${tool.label}`}
												checked={tool.enabled}
												disabled={updateBehaviorMutation.isPending}
												onCheckedChange={(checked) =>
													void handleToggleTool(tool, checked)
												}
											/>
										</div>
									))
								)}
							</div>
						</section>

						<section className="space-y-3">
							<div className="space-y-1">
								<h3 className="font-medium text-sm">Custom Tools</h3>
								<p className="text-muted-foreground text-xs">
									Custom tool support will appear here when it is available.
								</p>
							</div>
							<div className="rounded-md border border-border/60 border-dashed p-3">
								<p className="font-medium text-sm">No custom tools yet.</p>
								<p className="text-muted-foreground text-xs">
									Use default and optional tools for now.
								</p>
							</div>
						</section>
					</div>
				</SettingsRow>
			</PageContent>
		</SettingsPage>
	);
}
