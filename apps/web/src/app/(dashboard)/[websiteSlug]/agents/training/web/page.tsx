"use client";

import type { LinkSourceResponse } from "@cossistant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Icon from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
} from "@/components/ui/layout/settings-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return "0 KB";
	}

	const kb = bytes / 1024;
	if (kb < 1024) {
		return `${Math.round(kb)} KB`;
	}

	const mb = kb / 1024;
	return `${mb.toFixed(1)} MB`;
}

export default function WebSourcesPage() {
	const website = useWebsite();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [newUrl, setNewUrl] = useState("");
	const [isValidUrl, setIsValidUrl] = useState(false);

	// Get the AI agent for this website
	const { data: aiAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Get the training stats for plan limits
	const { data: stats } = useQuery(
		trpc.linkSource.getTrainingStats.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgent?.id ?? null,
		})
	);

	// Get list of link sources
	const { data: linkSources, isLoading: isLoadingLinkSources } = useQuery(
		trpc.linkSource.list.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgent?.id ?? null,
			limit: 100,
		})
	);

	// Create link source mutation
	const { mutateAsync: createLinkSource, isPending: isCreating } = useMutation(
		trpc.linkSource.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.linkSource.list.queryKey({
						websiteSlug: website.slug,
					}),
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.linkSource.getTrainingStats.queryKey({
						websiteSlug: website.slug,
					}),
				});
				setNewUrl("");
				toast.success("Link source added. Crawling started.");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to add link source");
			},
		})
	);

	// Delete link source mutation
	const { mutateAsync: deleteLinkSource, isPending: isDeleting } = useMutation(
		trpc.linkSource.delete.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.linkSource.list.queryKey({
						websiteSlug: website.slug,
					}),
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.linkSource.getTrainingStats.queryKey({
						websiteSlug: website.slug,
					}),
				});
				toast.success("Link source deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete link source");
			},
		})
	);

	// Recrawl link source mutation
	const { mutateAsync: recrawlLinkSource, isPending: isRecrawling } =
		useMutation(
			trpc.linkSource.recrawl.mutationOptions({
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.linkSource.list.queryKey({
							websiteSlug: website.slug,
						}),
					});
					toast.success("Recrawl started");
				},
				onError: (error) => {
					toast.error(error.message || "Failed to start recrawl");
				},
			})
		);

	// Cancel link source mutation
	const { mutateAsync: cancelLinkSource, isPending: isCancelling } =
		useMutation(
			trpc.linkSource.cancel.mutationOptions({
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: trpc.linkSource.list.queryKey({
							websiteSlug: website.slug,
						}),
					});
					await queryClient.invalidateQueries({
						queryKey: trpc.linkSource.getTrainingStats.queryKey({
							websiteSlug: website.slug,
						}),
					});
					toast.success("Crawl cancelled");
				},
				onError: (error) => {
					toast.error(error.message || "Failed to cancel crawl");
				},
			})
		);

	// Validate URL
	useEffect(() => {
		try {
			if (newUrl.trim()) {
				new URL(newUrl);
				setIsValidUrl(true);
			} else {
				setIsValidUrl(false);
			}
		} catch {
			setIsValidUrl(false);
		}
	}, [newUrl]);

	const handleAddLinkSource = async () => {
		if (!(isValidUrl && aiAgent?.id)) {
			return;
		}

		await createLinkSource({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			url: newUrl.trim(),
		});
	};

	const handleDelete = async (id: string) => {
		await deleteLinkSource({
			websiteSlug: website.slug,
			id,
		});
	};

	const handleRecrawl = async (id: string) => {
		await recrawlLinkSource({
			websiteSlug: website.slug,
			id,
		});
	};

	const handleCancel = async (id: string) => {
		await cancelLinkSource({
			websiteSlug: website.slug,
			id,
		});
	};

	// Check if at limit
	const isAtLinkLimit =
		stats?.planLimitLinks !== null &&
		stats?.planLimitLinks !== undefined &&
		(stats?.linkSourcesCount ?? 0) >= stats.planLimitLinks;

	const hasAnyCrawling = linkSources?.items.some(
		(item) => item.status === "crawling"
	);

	return (
		<SettingsPage>
			<SettingsHeader>Web Sources</SettingsHeader>
			<PageContent className="py-6">
				<div className="space-y-6">
					{/* Info Banner */}
					{!(aiAgent || isLoadingLinkSources) && (
						<Alert>
							<AlertTitle>Create an AI Agent first</AlertTitle>
							<AlertDescription>
								Before adding web sources, you need to create an AI agent. Go to
								the{" "}
								<a
									className="font-medium underline"
									href={`/${website.slug}/agents`}
								>
									General settings
								</a>{" "}
								to create one.
							</AlertDescription>
						</Alert>
					)}

					{/* Add URL Form */}
					{aiAgent && (
						<Card>
							<CardHeader>
								<CardTitle>Add Website</CardTitle>
								<CardDescription>
									Enter a URL to crawl. We'll automatically discover and extract
									content from all accessible pages.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex gap-3">
									<Input
										className="flex-1"
										disabled={isCreating || isAtLinkLimit}
										onChange={(e) => setNewUrl(e.target.value)}
										placeholder="https://docs.example.com"
										type="url"
										value={newUrl}
									/>
									<Button
										disabled={
											!isValidUrl || isCreating || isAtLinkLimit || !aiAgent
										}
										onClick={handleAddLinkSource}
									>
										{isCreating ? (
											<>
												<Icon
													className="mr-2 size-4 animate-spin"
													name="settings"
												/>
												Adding...
											</>
										) : (
											<>
												<Icon className="mr-2 size-4" name="plus" />
												Add & Crawl
											</>
										)}
									</Button>
								</div>

								{isAtLinkLimit && (
									<p className="mt-3 text-destructive text-sm">
										You've reached your plan's limit of {stats?.planLimitLinks}{" "}
										link sources.{" "}
										<a
											className="underline hover:text-destructive/80"
											href={`/${website.slug}/settings/plan`}
										>
											Upgrade your plan
										</a>{" "}
										to add more.
									</p>
								)}
							</CardContent>
						</Card>
					)}

					{/* Link Sources List */}
					<div>
						<h3 className="mb-4 font-medium text-lg">Link Sources</h3>

						{isLoadingLinkSources ? (
							<div className="space-y-3">
								<Skeleton className="h-20 w-full" />
								<Skeleton className="h-20 w-full" />
							</div>
						) : linkSources?.items.length === 0 ? (
							<Card className="border-dashed">
								<CardContent className="flex flex-col items-center justify-center py-12">
									<Icon
										className="mb-4 size-12 text-muted-foreground/50"
										name="dashboard"
									/>
									<p className="text-center text-muted-foreground">
										No link sources yet. Add a website URL above to get started.
									</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-3">
								{linkSources?.items.map((source) => (
									<LinkSourceCard
										isCancelling={isCancelling}
										isDeleting={isDeleting}
										isRecrawling={isRecrawling}
										key={source.id}
										onCancel={() => handleCancel(source.id)}
										onDelete={() => handleDelete(source.id)}
										onRecrawl={() => handleRecrawl(source.id)}
										source={source}
										websiteSlug={website.slug}
									/>
								))}
							</div>
						)}
					</div>

					{/* Crawling Status Banner */}
					{hasAnyCrawling && (
						<Alert>
							<Icon className="size-4 animate-spin" name="settings" />
							<AlertTitle>Crawling in progress</AlertTitle>
							<AlertDescription>
								Some sources are still being crawled. This page will update
								automatically when crawling is complete.
							</AlertDescription>
						</Alert>
					)}
				</div>
			</PageContent>
		</SettingsPage>
	);
}

type LinkSourceCardProps = {
	source: LinkSourceResponse;
	websiteSlug: string;
	onDelete: () => void;
	onRecrawl: () => void;
	onCancel: () => void;
	isDeleting: boolean;
	isRecrawling: boolean;
	isCancelling: boolean;
};

function LinkSourceCard({
	source,
	websiteSlug,
	onDelete,
	onRecrawl,
	onCancel,
	isDeleting,
	isRecrawling,
	isCancelling,
}: LinkSourceCardProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	// Poll for status updates if crawling
	const { data: statusData } = useQuery({
		...trpc.linkSource.getCrawlStatus.queryOptions({
			websiteSlug,
			id: source.id,
		}),
		refetchInterval: source.status === "crawling" ? 3000 : false,
		enabled: source.status === "crawling",
	});

	// When status changes from crawling to completed, invalidate queries
	useEffect(() => {
		if (
			statusData &&
			statusData.status !== "crawling" &&
			source.status === "crawling"
		) {
			// Status changed, invalidate queries
			queryClient.invalidateQueries({
				queryKey: trpc.linkSource.list.queryKey({
					websiteSlug,
				}),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.linkSource.getTrainingStats.queryKey({
					websiteSlug,
				}),
			});
		}
	}, [statusData, source.status, queryClient, trpc, websiteSlug]);

	const currentStatus = statusData?.status ?? source.status;
	const currentPagesCount =
		statusData?.crawledPagesCount ?? source.crawledPagesCount;
	const currentSizeBytes = statusData?.totalSizeBytes ?? source.totalSizeBytes;

	const statusConfig = {
		pending: {
			label: "Pending",
			variant: "secondary" as const,
			color: "text-muted-foreground",
		},
		crawling: {
			label: "Crawling...",
			variant: "secondary" as const,
			color: "text-blue-500",
		},
		completed: {
			label: "Completed",
			variant: "secondary" as const,
			color: "text-green-500",
		},
		failed: {
			label: "Failed",
			variant: "destructive" as const,
			color: "text-destructive",
		},
	};

	const status = statusConfig[currentStatus];

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center gap-2">
							<Icon
								className="size-4 shrink-0 text-muted-foreground"
								name="dashboard"
							/>
							<a
								className="truncate font-medium text-sm hover:underline"
								href={source.url}
								rel="noopener noreferrer"
								target="_blank"
							>
								{source.url}
							</a>
							<Badge className={status.color} variant={status.variant}>
								{currentStatus === "crawling" && (
									<Icon className="mr-1 size-3 animate-spin" name="settings" />
								)}
								{status.label}
							</Badge>
						</div>

						<div className="flex items-center gap-4 text-muted-foreground text-xs">
							<span>
								{currentPagesCount} {currentPagesCount === 1 ? "page" : "pages"}
							</span>
							<span>{formatBytes(currentSizeBytes)}</span>
							{source.lastCrawledAt && (
								<span>
									Last crawled{" "}
									{formatDistanceToNow(new Date(source.lastCrawledAt), {
										addSuffix: true,
									})}
								</span>
							)}
						</div>

						{source.errorMessage && currentStatus === "failed" && (
							<p className="mt-2 text-destructive text-xs">
								{source.errorMessage}
							</p>
						)}
					</div>

					<div className="flex items-center gap-2">
						{currentStatus === "crawling" || currentStatus === "pending" ? (
							// Show Cancel button when crawling or pending
							<Button
								disabled={isCancelling}
								onClick={onCancel}
								size="sm"
								title="Cancel crawl"
								variant="ghost"
							>
								{isCancelling ? (
									<Icon className="size-4 animate-spin" name="settings" />
								) : (
									<Icon className="size-4" name="cancel" />
								)}
							</Button>
						) : (
							// Show Recrawl and Delete buttons when completed or failed
							<>
								<Button
									disabled={isRecrawling || isDeleting}
									onClick={onRecrawl}
									size="sm"
									title="Recrawl"
									variant="ghost"
								>
									{isRecrawling ? (
										<Icon className="size-4 animate-spin" name="settings" />
									) : (
										<Icon className="size-4" name="play" />
									)}
								</Button>
								<Button
									disabled={isDeleting || isRecrawling}
									onClick={onDelete}
									size="sm"
									title="Delete"
									variant="ghost"
								>
									{isDeleting ? (
										<Icon className="size-4 animate-spin" name="settings" />
									) : (
										<Icon className="size-4" name="x" />
									)}
								</Button>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
