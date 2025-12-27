"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	groupLinkSourcesByDomain,
	type KnowledgePage,
	type LinkSource,
} from "@/data/link-source-cache";
import { useTRPC } from "@/lib/trpc/client";
import {
	buildMergedDomainTree,
	calculateDomainSummary,
	type DomainSummary,
	type MergedPageNode,
} from "../utils";

type UseMergedDomainTreeOptions = {
	websiteSlug: string;
	aiAgentId: string | null;
};

type DomainTreeData = {
	domain: string;
	summary: DomainSummary;
	sources: LinkSource[];
	tree: MergedPageNode[];
	isLoading: boolean;
};

type GroupedDomainData = Map<string, DomainTreeData>;

/**
 * Hook to fetch all link sources and their pages, grouped by domain
 * with merged page trees for each domain
 */
export function useMergedDomainTree({
	websiteSlug,
	aiAgentId,
}: UseMergedDomainTreeOptions) {
	const trpc = useTRPC();

	// Get all link sources
	const {
		data: linkSources,
		isLoading: isLoadingLinkSources,
		error: linkSourcesError,
	} = useQuery(
		trpc.linkSource.list.queryOptions({
			websiteSlug,
			aiAgentId,
			limit: 100,
		})
	);

	// Group link sources by domain
	const groupedByDomain = useMemo(() => {
		if (!linkSources?.items) {
			return new Map<string, LinkSource[]>();
		}
		return groupLinkSourcesByDomain(linkSources.items);
	}, [linkSources?.items]);

	// Get all source IDs for fetching pages
	const allSourceIds = useMemo(
		() => linkSources?.items.map((s) => s.id) ?? [],
		[linkSources?.items]
	);

	// Fetch pages for all sources in parallel
	const pagesQueries = useQueries({
		queries: allSourceIds.map((sourceId) =>
			trpc.linkSource.listKnowledgeByLinkSource.queryOptions({
				websiteSlug,
				linkSourceId: sourceId,
				limit: 100, // API max limit is 100
			})
		),
	});

	// Build the pages map (sourceId -> pages[])
	const pagesMap = useMemo(() => {
		const map = new Map<string, KnowledgePage[]>();

		for (const [index, query] of pagesQueries.entries()) {
			const sourceId = allSourceIds[index];
			if (sourceId && query.data?.items) {
				map.set(sourceId, query.data.items);
			}
		}

		return map;
	}, [pagesQueries, allSourceIds]);

	// Check if any pages are still loading
	const isLoadingPages = pagesQueries.some((q) => q.isLoading);

	// Build the grouped domain data with merged trees
	const groupedDomainData: GroupedDomainData = useMemo(() => {
		const result = new Map<string, DomainTreeData>();

		for (const [domain, sources] of groupedByDomain.entries()) {
			// Use crawledPagesCount from sources directly (no pagesMap needed for summary)
			const summary = calculateDomainSummary(domain, sources);
			const tree = buildMergedDomainTree(sources, pagesMap);

			// Check if any source in this domain is still loading pages
			const domainSourceIds = new Set(sources.map((s) => s.id));
			const isDomainLoading = pagesQueries.some((q, index) => {
				const sourceId = allSourceIds[index];
				return sourceId && domainSourceIds.has(sourceId) && q.isLoading;
			});

			result.set(domain, {
				domain,
				summary,
				sources,
				tree,
				isLoading: isDomainLoading,
			});
		}

		return result;
	}, [groupedByDomain, pagesMap, pagesQueries, allSourceIds]);

	// Check if there's any active crawl
	const hasAnyCrawling = useMemo(
		() =>
			linkSources?.items.some(
				(item) => item.status === "crawling" || item.status === "mapping"
			),
		[linkSources?.items]
	);

	return {
		// Raw data
		linkSources: linkSources?.items ?? [],
		groupedByDomain,
		pagesMap,

		// Processed data
		groupedDomainData,

		// Loading states
		isLoading: isLoadingLinkSources,
		isLoadingPages,

		// Status
		hasAnyCrawling,
		error: linkSourcesError,

		// Counts
		totalDomains: groupedByDomain.size,
		totalSources: linkSources?.items.length ?? 0,
	};
}

/**
 * Hook to fetch pages for a specific domain (lazy loading)
 * Use this when you want to load pages only when a domain is expanded
 */
export function useDomainPages({
	websiteSlug,
	sources,
	enabled = true,
}: {
	websiteSlug: string;
	sources: LinkSource[];
	enabled?: boolean;
}) {
	const trpc = useTRPC();

	const sourceIds = useMemo(() => sources.map((s) => s.id), [sources]);

	// Fetch pages for all sources in this domain (only when enabled)
	const pagesQueries = useQueries({
		queries: sourceIds.map((sourceId) => ({
			...trpc.linkSource.listKnowledgeByLinkSource.queryOptions({
				websiteSlug,
				linkSourceId: sourceId,
				limit: 100, // API max limit is 100
			}),
			enabled, // Only run queries when domain is expanded
		})),
		combine: (results) => ({
			data: results,
			isLoading: enabled && results.some((r) => r.isLoading),
			isError: results.some((r) => r.isError),
		}),
	});

	// Build pages map
	const pagesMap = useMemo(() => {
		const map = new Map<string, KnowledgePage[]>();

		for (const [index, query] of pagesQueries.data.entries()) {
			const sourceId = sourceIds[index];
			if (sourceId && query.data?.items) {
				map.set(sourceId, query.data.items);
			}
		}

		return map;
	}, [pagesQueries.data, sourceIds]);

	// Build merged tree
	const tree = useMemo(() => {
		if (!enabled || pagesQueries.isLoading) {
			return [];
		}
		return buildMergedDomainTree(sources, pagesMap);
	}, [enabled, pagesQueries.isLoading, sources, pagesMap]);

	return {
		tree,
		pagesMap,
		isLoading: pagesQueries.isLoading,
		isError: pagesQueries.isError,
	};
}
