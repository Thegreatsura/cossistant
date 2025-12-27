import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { DashboardRealtimeContext } from "../types";

type CrawlStartedEvent = RealtimeEvent<"crawlStarted">;
type CrawlProgressEvent = RealtimeEvent<"crawlProgress">;
type CrawlCompletedEvent = RealtimeEvent<"crawlCompleted">;
type CrawlFailedEvent = RealtimeEvent<"crawlFailed">;
type LinkSourceUpdatedEvent = RealtimeEvent<"linkSourceUpdated">;
type CrawlPagesDiscoveredEvent = RealtimeEvent<"crawlPagesDiscovered">;
type CrawlPageCompletedEvent = RealtimeEvent<"crawlPageCompleted">;

/**
 * Handle crawl started event - initial page discovery
 */
export function handleCrawlStarted({
	event,
	context,
}: {
	event: CrawlStartedEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Invalidate link source queries to refetch with new data
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "list"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source list:", error);
		});

	// Also invalidate specific link source query
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "get"],
				{ input: { websiteSlug: website.slug, id: payload.linkSourceId } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source:", error);
		});

	console.log(
		`[crawl-progress] Crawl started for ${payload.url}, discovered ${payload.totalPagesCount} pages`
	);
}

/**
 * Handle crawl progress event - page-by-page updates
 */
export function handleCrawlProgress({
	event,
	context,
}: {
	event: CrawlProgressEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Update the specific link source in the query cache
	// This provides real-time progress without full refetch
	queryClient.setQueriesData(
		{
			queryKey: [
				["linkSource", "get"],
				{ input: { websiteSlug: website.slug, id: payload.linkSourceId } },
			],
			exact: false,
		},
		(oldData: unknown) => {
			if (!oldData || typeof oldData !== "object") {
				return oldData;
			}

			const linkSource = oldData as {
				crawledPagesCount?: number;
				status?: string;
			};

			return {
				...linkSource,
				crawledPagesCount: payload.completedCount,
				status: "crawling",
			};
		}
	);

	console.log(
		`[crawl-progress] Page progress: ${payload.completedCount}/${payload.totalCount} for ${payload.url}`
	);
}

/**
 * Handle crawl completed event - final results
 */
export function handleCrawlCompleted({
	event,
	context,
}: {
	event: CrawlCompletedEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Invalidate all link source queries to get final data
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "list"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source list:", error);
		});

	// Invalidate specific link source
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "get"],
				{ input: { websiteSlug: website.slug, id: payload.linkSourceId } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source:", error);
		});

	// Invalidate knowledge queries for this link source
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "listKnowledgeByLinkSource"],
				{
					input: {
						websiteSlug: website.slug,
						linkSourceId: payload.linkSourceId,
					},
				},
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate knowledge list:", error);
		});

	// Invalidate training stats
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "getTrainingStats"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate training stats:", error);
		});

	console.log(
		`[crawl-progress] Crawl completed for ${payload.url}: ${payload.crawledPagesCount} pages, ${payload.totalSizeBytes} bytes`
	);
}

/**
 * Handle crawl failed event - error notification
 */
export function handleCrawlFailed({
	event,
	context,
}: {
	event: CrawlFailedEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Invalidate queries to show failed status
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "list"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source list:", error);
		});

	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "get"],
				{ input: { websiteSlug: website.slug, id: payload.linkSourceId } },
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate link source:", error);
		});

	console.error(
		`[crawl-progress] Crawl failed for ${payload.url}: ${payload.error}`
	);
}

/**
 * Handle link source updated event - status changes
 */
export function handleLinkSourceUpdated({
	event,
	context,
}: {
	event: LinkSourceUpdatedEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Update the link source in the cache with the new status
	queryClient.setQueriesData(
		{
			queryKey: [
				["linkSource", "get"],
				{ input: { websiteSlug: website.slug, id: payload.linkSourceId } },
			],
			exact: false,
		},
		(oldData: unknown) => {
			if (!oldData || typeof oldData !== "object") {
				return oldData;
			}

			return {
				...oldData,
				status: payload.status,
				...(payload.discoveredPagesCount !== undefined && {
					discoveredPagesCount: payload.discoveredPagesCount,
				}),
				...(payload.crawledPagesCount !== undefined && {
					crawledPagesCount: payload.crawledPagesCount,
				}),
				...(payload.totalSizeBytes !== undefined && {
					totalSizeBytes: payload.totalSizeBytes,
				}),
				...(payload.errorMessage !== undefined && {
					errorMessage: payload.errorMessage,
				}),
			};
		}
	);

	// Also update in list queries
	queryClient.setQueriesData(
		{
			queryKey: [
				["linkSource", "list"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		},
		(oldData: unknown) => {
			if (!oldData || typeof oldData !== "object") {
				return oldData;
			}

			const listData = oldData as {
				items?: Array<{
					id: string;
					status?: string;
					discoveredPagesCount?: number;
					crawledPagesCount?: number;
					totalSizeBytes?: number;
					errorMessage?: string | null;
				}>;
			};

			if (!listData.items) {
				return oldData;
			}

			return {
				...listData,
				items: listData.items.map((item) => {
					if (item.id !== payload.linkSourceId) {
						return item;
					}

					return {
						...item,
						status: payload.status,
						...(payload.discoveredPagesCount !== undefined && {
							discoveredPagesCount: payload.discoveredPagesCount,
						}),
						...(payload.crawledPagesCount !== undefined && {
							crawledPagesCount: payload.crawledPagesCount,
						}),
						...(payload.totalSizeBytes !== undefined && {
							totalSizeBytes: payload.totalSizeBytes,
						}),
						...(payload.errorMessage !== undefined && {
							errorMessage: payload.errorMessage,
						}),
					};
				}),
			};
		}
	);

	console.log(
		`[crawl-progress] Link source ${payload.linkSourceId} status: ${payload.status}`
	);
}

/**
 * Handle crawl pages discovered event - URLs found during map phase
 * This allows showing discovered pages in the tree before they're fully scraped
 */
export function handleCrawlPagesDiscovered({
	event,
	context,
}: {
	event: CrawlPagesDiscoveredEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Invalidate knowledge queries for this link source to pick up any pending pages
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "listKnowledgeByLinkSource"],
				{
					input: {
						websiteSlug: website.slug,
						linkSourceId: payload.linkSourceId,
					},
				},
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate knowledge list:", error);
		});

	console.log(
		`[crawl-progress] Discovered ${payload.pages.length} pages for link source ${payload.linkSourceId}`
	);
}

/**
 * Handle crawl page completed event - individual page scraped
 * Updates the knowledge list in real-time as pages complete
 */
export function handleCrawlPageCompleted({
	event,
	context,
}: {
	event: CrawlPageCompletedEvent;
	context: DashboardRealtimeContext;
}) {
	const { queryClient, website } = context;
	const { payload } = event;

	// Invalidate knowledge queries for this link source to add the new page
	queryClient
		.invalidateQueries({
			queryKey: [
				["linkSource", "listKnowledgeByLinkSource"],
				{
					input: {
						websiteSlug: website.slug,
						linkSourceId: payload.linkSourceId,
					},
				},
			],
			exact: false,
		})
		.catch((error) => {
			console.error("Failed to invalidate knowledge list:", error);
		});

	// Also update the link source crawled count in the list cache
	queryClient.setQueriesData(
		{
			queryKey: [
				["linkSource", "list"],
				{ input: { websiteSlug: website.slug } },
			],
			exact: false,
		},
		(oldData: unknown) => {
			if (!oldData || typeof oldData !== "object") {
				return oldData;
			}

			const listData = oldData as {
				items?: Array<{
					id: string;
					crawledPagesCount?: number;
					totalSizeBytes?: number;
				}>;
			};

			if (!listData.items) {
				return oldData;
			}

			return {
				...listData,
				items: listData.items.map((item) => {
					if (item.id !== payload.linkSourceId) {
						return item;
					}

					return {
						...item,
						crawledPagesCount: (item.crawledPagesCount ?? 0) + 1,
						totalSizeBytes: (item.totalSizeBytes ?? 0) + payload.page.sizeBytes,
					};
				}),
			};
		}
	);

	console.log(
		`[crawl-progress] Page completed: ${payload.page.url} (${payload.page.sizeBytes} bytes)`
	);
}
