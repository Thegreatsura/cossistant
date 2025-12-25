import { env } from "@api/env";

// Firecrawl API types based on their SDK documentation
type FirecrawlScrapeOptions = {
	formats?: Array<"markdown" | "html">;
};

type FirecrawlCrawlParams = {
	limit?: number;
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
	error?: string;
};

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1";

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
	 * Start an async crawl job
	 */
	async startCrawl(url: string, limit: number): Promise<CrawlResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(`${FIRECRAWL_API_BASE}/crawl`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					url,
					limit,
					scrapeOptions: {
						formats: ["markdown"],
					},
				} satisfies { url: string } & FirecrawlCrawlParams),
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
	 * Scrape a single page (synchronous, returns immediately with content)
	 * Useful for extracting brand information from a homepage
	 */
	async scrapeSinglePage(url: string): Promise<ScrapeResult> {
		if (!this.isConfigured()) {
			return {
				success: false,
				error: "Firecrawl API key not configured",
			};
		}

		try {
			const response = await fetch(`${FIRECRAWL_API_BASE}/scrape`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					url,
					formats: ["markdown", "html"],
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Firecrawl API error: ${response.status} ${errorText}`,
				};
			}

			const data = (await response.json()) as FirecrawlScrapeResponse;

			if (!(data.success && data.data)) {
				return {
					success: false,
					error: data.error ?? "Unknown error scraping page",
				};
			}

			return {
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
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return {
				success: false,
				error: `Failed to scrape page: ${message}`,
			};
		}
	}

	/**
	 * Extract brand information from a website's homepage
	 * Uses scrapeSinglePage and extracts relevant brand metadata
	 */
	async extractBrandInfo(url: string): Promise<BrandInfo> {
		const scrapeResult = await this.scrapeSinglePage(url);

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
					companyName = companyName.split(sep)[0].trim();
					break;
				}
			}
		}

		return {
			success: true,
			companyName,
			description:
				scrapeResult.data.ogDescription ?? scrapeResult.data.description,
			logo: scrapeResult.data.ogImage,
			favicon: scrapeResult.data.favicon,
			language: scrapeResult.data.language,
			keywords: scrapeResult.data.keywords,
		};
	}
}

// Export a singleton instance
export const firecrawlService = new FirecrawlService();
