import { env } from "@api/env";

// Regex patterns for URL filtering (defined at top level for performance)
const TRAILING_SLASH_REGEX = /\/$/;
const LEADING_SLASH_REGEX = /^\//;

// Firecrawl API types based on their SDK documentation (v2)
type FirecrawlScrapeOptions = {
	formats?: Array<"markdown" | "html">;
	/** Only return the main content of the page (excludes nav, headers, footers) */
	onlyMainContent?: boolean;
	/** HTML tags to include (e.g., ["p", "h1", "article"]) */
	includeTags?: string[];
	/** HTML tags to exclude (e.g., ["nav", "footer", ".sidebar"]) */
	excludeTags?: string[];
	/** Custom parsers to use */
	parsers?: string[];
};

// Batch scrape API types
type FirecrawlBatchScrapeParams = {
	urls: string[];
	formats?: Array<"markdown" | "html">;
	onlyMainContent?: boolean;
	includeTags?: string[];
	excludeTags?: string[];
};

type FirecrawlBatchScrapeResponse = {
	success: boolean;
	id?: string;
	url?: string;
	error?: string;
};

type FirecrawlBatchScrapeStatusResponse = {
	success: boolean;
	status: "scraping" | "completed" | "failed";
	completed?: number;
	total?: number;
	creditsUsed?: number;
	expiresAt?: string;
	data?: FirecrawlPageData[];
	error?: string;
};

type FirecrawlCrawlParams = {
	limit?: number;
	/** Maximum depth of links to follow from the starting URL */
	maxDiscoveryDepth?: number;
	includePaths?: string[];
	excludePaths?: string[];
	scrapeOptions?: FirecrawlScrapeOptions;
};

type FirecrawlCrawlResponse = {
	success: boolean;
	id?: string;
	error?: string;
};

type FirecrawlPageData = {
	markdown?: string;
	html?: string;
	metadata?: {
		title?: string;
		description?: string;
		sourceURL?: string;
		ogTitle?: string;
		ogDescription?: string;
		ogImage?: string;
		favicon?: string;
		language?: string;
		keywords?: string;
	};
};

type FirecrawlScrapeResponse = {
	success: boolean;
	data?: FirecrawlPageData;
	error?: string;
};

type FirecrawlCrawlStatusResponse = {
	success: boolean;
	status: "scraping" | "completed" | "failed";
	completed?: number;
	total?: number;
	creditsUsed?: number;
	expiresAt?: string;
	data?: FirecrawlPageData[];
	error?: string;
};

export type CrawlResult = {
	success: boolean;
	jobId?: string;
	error?: string;
};

export type CrawlStatus = {
	status: "pending" | "crawling" | "completed" | "failed";
	progress?: {
		completed: number;
		total: number;
	};
	pages?: Array<{
		url: string;
		title: string | null;
		markdown: string;
		sizeBytes: number;
	}>;
	error?: string;
};

export type ScrapeResult = {
	success: boolean;
	data?: {
		markdown: string;
		html?: string;
		title?: string;
		description?: string;
		ogTitle?: string;
		ogDescription?: string;
		ogImage?: string;
		favicon?: string;
		language?: string;
		keywords?: string;
		sourceUrl: string;
	};
	error?: string;
};

export type BrandInfo = {
	success: boolean;
	companyName?: string;
	description?: string;
	logo?: string;
	favicon?: string;
	language?: string;
	keywords?: string;
	/** Full markdown content from the page, used for prompt generation */
	markdown?: string;
	error?: string;
};

/**
 * Map result - discovered URLs from a website
 */
export type MapResult = {
	success: boolean;
	urls?: string[];
	error?: string;
};

/**
 * Batch scrape result - async job started
 */
export type BatchScrapeResult = {
	success: boolean;
	jobId?: string;
	error?: string;
};

/**
 * Batch scrape status - current state of batch scrape job
 */
export type BatchScrapeStatus = {
	status: "pending" | "scraping" | "completed" | "failed";
	progress?: {
		completed: number;
		total: number;
	};
	pages?: Array<{
		url: string;
		title: string | null;
		markdown: string;
		sizeBytes: number;
	}>;
	error?: string;
};

/**
 * Options for batch scraping
 */
export type BatchScrapeOptions = {
	/** Only return the main content of the page (excludes nav, headers, footers). Default: true */
	onlyMainContent?: boolean;
	/** HTML tags to include */
	includeTags?: string[];
	/** HTML tags to exclude */
	excludeTags?: string[];
};

/**
 * Options for mapSite
 */
export type MapOptions = {
	/** Search query to filter URLs */
	search?: string;
	/** Ignore sitemap and only use links found on the page (default: false) */
	ignoreSitemap?: boolean;
	/** Only use URLs from sitemap, ignore discovered links */
	sitemapOnly?: boolean;
	/** Include URLs from subdomains */
	includeSubdomains?: boolean;
	/** Maximum number of URLs to return (max 5000) */
	limit?: number;
	/** Cache duration in seconds. Use cached results if available within this age. */
	maxAge?: number;
};

// Firecrawl Map API response type
type FirecrawlMapResponse = {
	success: boolean;
	links?: string[];
	error?: string;
};

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v2";

/**
 * Firecrawl service for web crawling
 */
export class FirecrawlService {
	private apiKey: string;

	constructor(apiKey?: string) {
		this.apiKey = apiKey ?? env.FIRECRAWL_API_KEY;
		if (!this.apiKey) {
			console.warn(
				"Firecrawl API key not configured. Web crawling will not work."
			);
		}
	}

	/**
	 * Check if Firecrawl is configured
	 */
	isConfigured(): boolean {
		return Boolean(this.apiKey);
	}

	/**
	 * Start an async crawl job using v2 API
	 * @param url - The URL to crawl
	 * @param options - Crawl configuration options
	 */
	async startCrawl(
		url: string,
		options: {
			limit?: number;
			/** Maximum depth of links to follow from the starting URL */
			maxDepth?: number;
			includePaths?: string[];
			excludePaths?: string[];
		} = {}
	): Promise<CrawlResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		const { limit = 100, maxDepth = 5, includePaths, excludePaths } = options;

		try {
			const crawlParams: { url: string } & FirecrawlCrawlParams = {
				url,
				limit,
				maxDiscoveryDepth: maxDepth,
				scrapeOptions: {
					formats: ["markdown"],
					// Enable onlyMainContent for cleaner extracts (excludes nav, headers, footers)
					onlyMainContent: true,
				},
			};

			// Only include paths if they are non-empty arrays
			if (includePaths && includePaths.length > 0) {
				crawlParams.includePaths = includePaths;
			}
			if (excludePaths && excludePaths.length > 0) {
				crawlParams.excludePaths = excludePaths;
			}

			const response = await fetch(`${FIRECRAWL_API_BASE}/crawl`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(crawlParams),
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlCrawlResponse;

			if (!(data.success && data.id)) {
				return {
					success: false,
					error: data.error ?? "Unknown error starting crawl",
				};
			}

			return {
				success: true,
				jobId: data.id,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				success: false,
				error: `Failed to start crawl: ${message}`,
			};
		}
	}

	/**
	 * Get the status of a crawl job
	 */
	async getCrawlStatus(jobId: string): Promise<CrawlStatus> {
		if (!this.isConfigured()) {
			return {
				status: "failed",
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(`${FIRECRAWL_API_BASE}/crawl/${jobId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					status: "failed",
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlCrawlStatusResponse;

			if (!data.success) {
				return {
					status: "failed",
					error: data.error ?? "Unknown error checking crawl status",
				};
			}

			// Map Firecrawl status to our internal status
			const statusMap: Record<
				FirecrawlCrawlStatusResponse["status"],
				CrawlStatus["status"]
			> = {
				scraping: "crawling",
				completed: "completed",
				failed: "failed",
			};

			const status = statusMap[data.status] ?? "pending";

			const result: CrawlStatus = {
				status,
				progress:
					data.completed !== undefined && data.total !== undefined
						? {
								completed: data.completed,
								total: data.total,
							}
						: undefined,
			};

			// If completed, include the crawled pages
			if (status === "completed" && data.data) {
				result.pages = data.data
					.filter((page) => page.markdown && page.metadata?.sourceURL)
					.map((page) => ({
						url: page.metadata?.sourceURL ?? "",
						title: page.metadata?.title ?? page.metadata?.ogTitle ?? null,
						markdown: page.markdown ?? "",
						sizeBytes: new TextEncoder().encode(page.markdown ?? "").length,
					}));
			}

			if (status === "failed") {
				result.error = data.error ?? "Crawl failed";
			}

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				status: "failed",
				error: `Failed to get crawl status: ${message}`,
			};
		}
	}

	/**
	 * Cancel a crawl job
	 */
	async cancelCrawl(
		jobId: string
	): Promise<{ success: boolean; error?: string }> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(`${FIRECRAWL_API_BASE}/crawl/${jobId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				success: false,
				error: `Failed to cancel crawl: ${message}`,
			};
		}
	}

	/**
	 * Start an async batch scrape job for multiple URLs
	 * More efficient than crawl when URLs are already known (e.g., from mapSite)
	 * Uses onlyMainContent by default for cleaner, smaller extracts
	 *
	 * @param urls - Array of URLs to scrape (max 1000)
	 * @param options - Batch scrape configuration options
	 */
	async startBatchScrape(
		urls: string[],
		options: BatchScrapeOptions = {}
	): Promise<BatchScrapeResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		if (urls.length === 0) {
			return {
				success: false,
				error: "No URLs provided for batch scrape",
			};
		}

		// Limit to 1000 URLs per batch (Firecrawl limit)
		const urlsToScrape = urls.slice(0, 1000);

		try {
			const batchParams: FirecrawlBatchScrapeParams = {
				urls: urlsToScrape,
				formats: ["markdown"],
				// Enable onlyMainContent by default for cleaner extracts
				onlyMainContent: options.onlyMainContent ?? true,
			};

			// Only include tag filters if specified
			if (options.includeTags && options.includeTags.length > 0) {
				batchParams.includeTags = options.includeTags;
			}
			if (options.excludeTags && options.excludeTags.length > 0) {
				batchParams.excludeTags = options.excludeTags;
			}

			const response = await fetch(`${FIRECRAWL_API_BASE}/batch/scrape`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(batchParams),
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlBatchScrapeResponse;

			if (!(data.success && data.id)) {
				return {
					success: false,
					error: data.error ?? "Unknown error starting batch scrape",
				};
			}

			return {
				success: true,
				jobId: data.id,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				success: false,
				error: `Failed to start batch scrape: ${message}`,
			};
		}
	}

	/**
	 * Get the status of a batch scrape job
	 */
	async getBatchScrapeStatus(jobId: string): Promise<BatchScrapeStatus> {
		if (!this.isConfigured()) {
			return {
				status: "failed",
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(
				`${FIRECRAWL_API_BASE}/batch/scrape/${jobId}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
					},
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				return {
					status: "failed",
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data =
				(await response.json()) as FirecrawlBatchScrapeStatusResponse;

			if (!data.success) {
				return {
					status: "failed",
					error: data.error ?? "Unknown error checking batch scrape status",
				};
			}

			// Map Firecrawl status to our internal status
			const statusMap: Record<
				FirecrawlBatchScrapeStatusResponse["status"],
				BatchScrapeStatus["status"]
			> = {
				scraping: "scraping",
				completed: "completed",
				failed: "failed",
			};

			const status = statusMap[data.status] ?? "pending";

			const result: BatchScrapeStatus = {
				status,
				progress:
					data.completed !== undefined && data.total !== undefined
						? {
								completed: data.completed,
								total: data.total,
							}
						: undefined,
			};

			// If completed, include the scraped pages
			if (status === "completed" && data.data) {
				result.pages = data.data
					.filter((page) => page.markdown && page.metadata?.sourceURL)
					.map((page) => ({
						url: page.metadata?.sourceURL ?? "",
						title: page.metadata?.title ?? page.metadata?.ogTitle ?? null,
						markdown: page.markdown ?? "",
						sizeBytes: new TextEncoder().encode(page.markdown ?? "").length,
					}));
			}

			if (status === "failed") {
				result.error = data.error ?? "Batch scrape failed";
			}

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				status: "failed",
				error: `Failed to get batch scrape status: ${message}`,
			};
		}
	}

	/**
	 * Cancel a batch scrape job
	 */
	async cancelBatchScrape(
		jobId: string
	): Promise<{ success: boolean; error?: string }> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(
				`${FIRECRAWL_API_BASE}/batch/scrape/${jobId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
					},
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			return { success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				success: false,
				error: `Failed to cancel batch scrape: ${message}`,
			};
		}
	}

	/**
	 * Scrape a single page (synchronous, returns immediately with content)
	 * Uses Firecrawl v2 API with cache disabled for fresh results
	 * Useful for extracting brand information from a homepage
	 */
	async scrapeSinglePage(
		url: string,
		options?: { maxAge?: number }
	): Promise<ScrapeResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		console.log("[firecrawl] scrapeSinglePage called for:", url);

		try {
			// Firecrawl v2 API scrape request
			// maxAge enables caching - value in seconds (default 1 hour for onboarding)
			const requestBody: Record<string, unknown> = {
				url,
				formats: ["markdown", "html"],
				// Don't use onlyMainContent - we need full page for meta tags extraction
				onlyMainContent: false,
			};

			// Add maxAge for caching if specified (in seconds)
			if (options?.maxAge !== undefined) {
				requestBody.maxAge = options.maxAge;
			}

			console.log("[firecrawl] Scrape request body:", requestBody);

			const response = await fetch(`${FIRECRAWL_API_BASE}/scrape`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("[firecrawl] API error response:", {
					status: response.status,
					body: errorText,
				});
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlScrapeResponse;

			// Log the raw API response for debugging
			console.log("[firecrawl] Raw API response:", {
				success: data.success,
				hasData: !!data.data,
				metadata: data.data?.metadata,
				markdownLength: data.data?.markdown?.length ?? 0,
				error: data.error,
			});

			if (!(data.success && data.data)) {
				return {
					success: false,
					error: data.error ?? "Unknown error scraping page",
				};
			}

			const result = {
				success: true,
				data: {
					markdown: data.data.markdown ?? "",
					html: data.data.html,
					title: data.data.metadata?.title ?? data.data.metadata?.ogTitle,
					description:
						data.data.metadata?.description ??
						data.data.metadata?.ogDescription,
					ogTitle: data.data.metadata?.ogTitle,
					ogDescription: data.data.metadata?.ogDescription,
					ogImage: data.data.metadata?.ogImage,
					favicon: data.data.metadata?.favicon,
					language: data.data.metadata?.language,
					keywords: data.data.metadata?.keywords,
					sourceUrl: data.data.metadata?.sourceURL ?? url,
				},
			};

			console.log("[firecrawl] Parsed scrape result:", {
				title: result.data.title,
				description: result.data.description?.substring(0, 100),
				ogDescription: result.data.ogDescription?.substring(0, 100),
				hasMarkdown: !!result.data.markdown,
				markdownLength: result.data.markdown.length,
			});

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("[firecrawl] Scrape exception:", message);
			return {
				success: false,
				error: `Failed to scrape page: ${message}`,
			};
		}
	}

	/**
	 * Map a website to discover all URLs
	 * Uses Firecrawl v2 /map endpoint to quickly discover pages without scraping content
	 * Cache disabled for fresh results
	 *
	 * By default, uses the sitemap (ignoreSitemap: false) to discover more URLs
	 */
	async mapSite(url: string, options: MapOptions = {}): Promise<MapResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		console.log("[firecrawl] mapSite called for:", url, "options:", options);

		try {
			// Firecrawl v2 API map request
			// Note: v2 /map endpoint has different parameters than v1
			const requestBody: Record<string, unknown> = {
				url,
				search: options.search,
				includeSubdomains: options.includeSubdomains ?? false,
				limit: options.limit ?? 100,
			};

			// Add maxAge for caching if specified (in seconds)
			if (options.maxAge !== undefined) {
				requestBody.maxAge = options.maxAge;
			}

			const response = await fetch(`${FIRECRAWL_API_BASE}/map`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("[firecrawl] Map API error:", {
					status: response.status,
					body: errorText,
				});
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlMapResponse;

			console.log("[firecrawl] Map API response:", {
				success: data.success,
				linksCount: data.links?.length ?? 0,
				error: data.error,
			});

			if (!data.success) {
				return {
					success: false,
					error: data.error ?? "Unknown error mapping site",
				};
			}

			return {
				success: true,
				urls: data.links ?? [],
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error("[firecrawl] Map exception:", message);
			return {
				success: false,
				error: `Failed to map site: ${message}`,
			};
		}
	}

	/**
	 * Filter URLs based on include/exclude paths
	 * Include paths: only URLs matching at least one include path
	 * Exclude paths: skip URLs matching any exclude path
	 */
	filterUrls(
		urls: string[],
		options: {
			includePaths?: string[] | null;
			excludePaths?: string[] | null;
			maxDepth?: number;
			baseUrl?: string;
		} = {}
	): string[] {
		const { includePaths, excludePaths, maxDepth = 1, baseUrl } = options;

		return urls.filter((urlStr) => {
			try {
				const url = new URL(urlStr);
				const path = url.pathname;

				// Filter by depth (count path segments)
				if (baseUrl) {
					const baseUrlObj = new URL(baseUrl);
					const basePath = baseUrlObj.pathname.replace(
						TRAILING_SLASH_REGEX,
						""
					);
					const relativePath = path
						.replace(basePath, "")
						.replace(LEADING_SLASH_REGEX, "");
					const depth = relativePath
						? relativePath.split("/").filter(Boolean).length
						: 0;

					if (depth > maxDepth) {
						return false;
					}
				}

				// If include paths specified, URL must match at least one
				if (includePaths && includePaths.length > 0) {
					const matchesInclude = includePaths.some((pattern) => {
						if (pattern.endsWith("*")) {
							return path.startsWith(pattern.slice(0, -1));
						}
						return path === pattern || path.startsWith(`${pattern}/`);
					});
					if (!matchesInclude) {
						return false;
					}
				}

				// If exclude paths specified, URL must not match any
				if (excludePaths && excludePaths.length > 0) {
					const matchesExclude = excludePaths.some((pattern) => {
						if (pattern.endsWith("*")) {
							return path.startsWith(pattern.slice(0, -1));
						}
						return path === pattern || path.startsWith(`${pattern}/`);
					});
					if (matchesExclude) {
						return false;
					}
				}

				return true;
			} catch {
				// Invalid URL, exclude it
				return false;
			}
		});
	}

	/**
	 * Extract brand information from a website's homepage
	 * Uses scrapeSinglePage and extracts relevant brand metadata
	 */
	async extractBrandInfo(
		url: string,
		options?: { maxAge?: number }
	): Promise<BrandInfo> {
		console.log("[firecrawl] extractBrandInfo called for:", url);
		const scrapeResult = await this.scrapeSinglePage(url, options);

		// Log raw scrape result for debugging
		console.log("[firecrawl] Raw scrape result:", {
			success: scrapeResult.success,
			hasData: !!scrapeResult.data,
			title: scrapeResult.data?.title,
			ogTitle: scrapeResult.data?.ogTitle,
			description: scrapeResult.data?.description?.substring(0, 100),
			ogDescription: scrapeResult.data?.ogDescription?.substring(0, 100),
			markdownLength: scrapeResult.data?.markdown?.length ?? 0,
			error: scrapeResult.error,
		});

		if (!scrapeResult.success) {
			return {
				success: false,
				error: scrapeResult.error ?? "Failed to scrape website",
			};
		}

		if (!scrapeResult.data) {
			return {
				success: false,
				error: "No data returned from scrape",
			};
		}

		// Extract company name from title or OG title
		// Try to get a clean company name by removing common suffixes
		let companyName = scrapeResult.data.ogTitle ?? scrapeResult.data.title;
		if (companyName) {
			// Remove common separators and trailing parts (e.g., "Acme | Home" -> "Acme")
			const separators = [" | ", " - ", " – ", " — ", " :: "];
			for (const sep of separators) {
				if (companyName.includes(sep)) {
					const firstPart = companyName.split(sep)[0];
					if (firstPart) {
						companyName = firstPart.trim();
					}
					break;
				}
			}
		}

		const brandInfo = {
			success: true,
			companyName,
			description:
				scrapeResult.data.ogDescription ?? scrapeResult.data.description,
			logo: scrapeResult.data.ogImage,
			favicon: scrapeResult.data.favicon,
			language: scrapeResult.data.language,
			keywords: scrapeResult.data.keywords,
			markdown: scrapeResult.data.markdown,
		};

		console.log("[firecrawl] Extracted brand info:", {
			companyName: brandInfo.companyName,
			description: brandInfo.description?.substring(0, 100),
			hasMarkdown: !!brandInfo.markdown,
		});

		return brandInfo;
	}
}

// Export a singleton instance
export const firecrawlService = new FirecrawlService();
