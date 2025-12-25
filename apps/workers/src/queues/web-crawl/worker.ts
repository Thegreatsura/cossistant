import { createKnowledge } from "@api/db/queries/knowledge";
import {
	getLinkSourceById,
	getLinkSourceTotalSize,
	updateLinkSource,
} from "@api/db/queries/link-source";
import { getWebsiteById } from "@api/db/queries/website";
import { getPlanForWebsite } from "@api/lib/plans/access";
import { FirecrawlService } from "@api/services/firecrawl";
import { QUEUE_NAMES, type WebCrawlJobData } from "@cossistant/jobs";
import { getSafeRedisUrl, type RedisOptions } from "@cossistant/redis";
import { db } from "@workers/db";
import { env } from "@workers/env";
import { type Job, Queue, QueueEvents, Worker } from "bullmq";

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 360; // 30 minutes max (360 * 5s)

// Convert MB to bytes
const MB_TO_BYTES = 1024 * 1024;

type WorkerConfig = {
	connectionOptions: RedisOptions;
	redisUrl: string;
};

/**
 * Helper to convert FeatureValue to a number limit
 */
function toNumericLimit(value: number | boolean | null): number | null {
	if (value === null || value === true) {
		return null; // unlimited
	}
	if (value === false) {
		return 0; // disabled
	}
	return value; // numeric limit
}

/**
 * Sleep helper for polling
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createWebCrawlWorker({
	connectionOptions,
	redisUrl,
}: WorkerConfig) {
	const queueName = QUEUE_NAMES.WEB_CRAWL;
	const safeRedisUrl = getSafeRedisUrl(redisUrl);
	let worker: Worker<WebCrawlJobData> | null = null;
	let events: QueueEvents | null = null;
	let maintenanceQueue: Queue<WebCrawlJobData> | null = null;

	// Create Firecrawl service with the API key from workers env
	const firecrawlService = new FirecrawlService(env.FIRECRAWL_API_KEY);

	const buildConnectionOptions = (): RedisOptions => ({
		...connectionOptions,
		tls: connectionOptions.tls ? { ...connectionOptions.tls } : undefined,
	});

	return {
		start: async () => {
			if (worker) {
				return;
			}

			console.log(
				`[worker:web-crawl] Using queue=${queueName} redis=${safeRedisUrl}`
			);

			maintenanceQueue = new Queue<WebCrawlJobData>(queueName, {
				connection: buildConnectionOptions(),
			});
			await maintenanceQueue.waitUntilReady();

			events = new QueueEvents(queueName, {
				connection: buildConnectionOptions(),
			});
			events.on("waiting", ({ jobId }) => {
				console.log(`[worker:web-crawl] Job ${jobId} waiting`);
			});
			events.on("active", ({ jobId }) => {
				console.log(`[worker:web-crawl] Job ${jobId} active`);
			});
			events.on("failed", ({ jobId, failedReason }) => {
				console.error(
					`[worker:web-crawl] Job ${jobId} failed: ${failedReason}`
				);
			});
			await events.waitUntilReady();

			worker = new Worker<WebCrawlJobData>(
				queueName,
				async (job: Job<WebCrawlJobData>) => {
					const start = Date.now();
					console.log(
						`[worker:web-crawl] Executing job ${job.id} | linkSource: ${job.data.linkSourceId} | url: ${job.data.url}`
					);

					try {
						await processWebCrawlJob(firecrawlService, job);
						const duration = Date.now() - start;
						console.log(
							`[worker:web-crawl] Completed job ${job.id} in ${duration}ms`
						);
					} catch (error) {
						const duration = Date.now() - start;
						console.error(
							`[worker:web-crawl] Failed job ${job.id} after ${duration}ms`,
							error
						);
						throw error;
					}
				},
				{
					connection: buildConnectionOptions(),
					concurrency: 3, // Limit parallel crawls
				}
			);

			worker.on("error", (error) => {
				console.error("[worker:web-crawl] Worker error", error);
			});

			await worker.waitUntilReady();
			console.log("[worker:web-crawl] Worker started");
		},
		stop: async () => {
			await Promise.all([
				(async () => {
					if (worker) {
						await worker.close();
						worker = null;
						console.log("[worker:web-crawl] Worker stopped");
					}
				})(),
				(async () => {
					if (events) {
						await events.close();
						events = null;
						console.log("[worker:web-crawl] Queue events stopped");
					}
				})(),
				(async () => {
					if (maintenanceQueue) {
						await maintenanceQueue.close();
						maintenanceQueue = null;
						console.log("[worker:web-crawl] Maintenance queue closed");
					}
				})(),
			]);
		},
	};
}

async function processWebCrawlJob(
	firecrawlService: FirecrawlService,
	job: Job<WebCrawlJobData>
): Promise<void> {
	const {
		linkSourceId,
		websiteId,
		organizationId,
		aiAgentId,
		url,
		crawlLimit,
		createdBy,
	} = job.data;

	// 1. Get the link source and validate it exists
	const linkSource = await getLinkSourceById(db, {
		id: linkSourceId,
		websiteId,
	});

	if (!linkSource) {
		console.log(
			`[worker:web-crawl] Link source ${linkSourceId} not found, skipping`
		);
		return;
	}

	// Skip if already completed or failed (could be a duplicate job)
	if (linkSource.status === "completed" || linkSource.status === "failed") {
		console.log(
			`[worker:web-crawl] Link source ${linkSourceId} already ${linkSource.status}, skipping`
		);
		return;
	}

	// 2. Update status to crawling
	await updateLinkSource(db, {
		id: linkSourceId,
		websiteId,
		status: "crawling",
	});

	await job.updateProgress(10);

	// 3. Check if Firecrawl is configured
	if (!firecrawlService.isConfigured()) {
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "failed",
			errorMessage: "Firecrawl API is not configured",
		});
		throw new Error("Firecrawl API is not configured");
	}

	// 4. Start the crawl
	console.log(
		`[worker:web-crawl] Starting crawl for ${url} with limit ${crawlLimit}`
	);
	const crawlResult = await firecrawlService.startCrawl(url, crawlLimit);

	if (!(crawlResult.success && crawlResult.jobId)) {
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "failed",
			errorMessage: crawlResult.error ?? "Failed to start crawl",
		});
		throw new Error(crawlResult.error ?? "Failed to start crawl");
	}

	// 5. Store the Firecrawl job ID
	await updateLinkSource(db, {
		id: linkSourceId,
		websiteId,
		firecrawlJobId: crawlResult.jobId,
	});

	await job.updateProgress(20);

	// 6. Poll for completion
	let pollAttempts = 0;
	let crawlStatus = await firecrawlService.getCrawlStatus(crawlResult.jobId);

	while (
		crawlStatus.status === "crawling" &&
		pollAttempts < MAX_POLL_ATTEMPTS
	) {
		await sleep(POLL_INTERVAL_MS);
		pollAttempts++;

		crawlStatus = await firecrawlService.getCrawlStatus(crawlResult.jobId);

		// Update progress based on Firecrawl progress
		if (crawlStatus.progress) {
			const progressPercent =
				20 +
				Math.floor(
					(crawlStatus.progress.completed / crawlStatus.progress.total) * 60
				);
			await job.updateProgress(Math.min(progressPercent, 80));
		}

		console.log(
			`[worker:web-crawl] Polling ${crawlResult.jobId} - status: ${crawlStatus.status}, attempt: ${pollAttempts}`
		);
	}

	// 7. Handle poll timeout
	if (crawlStatus.status === "crawling") {
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "failed",
			errorMessage: "Crawl timed out after 30 minutes",
		});
		throw new Error("Crawl timed out after 30 minutes");
	}

	// 8. Handle failure
	if (crawlStatus.status === "failed") {
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "failed",
			errorMessage: crawlStatus.error ?? "Crawl failed",
		});
		throw new Error(crawlStatus.error ?? "Crawl failed");
	}

	await job.updateProgress(85);

	// 9. Process results
	if (crawlStatus.status === "completed" && crawlStatus.pages) {
		console.log(
			`[worker:web-crawl] Crawl completed with ${crawlStatus.pages.length} pages`
		);

		// Get plan size limits
		const website = await getWebsiteById(db, {
			orgId: organizationId,
			websiteId,
		});
		if (!website) {
			throw new Error("Website not found");
		}

		const planInfo = await getPlanForWebsite(website);
		const sizeLimitMb = toNumericLimit(
			planInfo.features["ai-agent-training-mb"]
		);
		const sizeLimitBytes =
			sizeLimitMb !== null ? sizeLimitMb * MB_TO_BYTES : null;

		// Get current total size
		const currentTotalSize = await getLinkSourceTotalSize(db, {
			websiteId,
			aiAgentId,
		});

		let totalSizeBytes = 0;
		let crawledPagesCount = 0;

		// Create knowledge entries for each page
		for (const page of crawlStatus.pages) {
			// Check size limit
			const newTotalSize = currentTotalSize + totalSizeBytes + page.sizeBytes;

			if (sizeLimitBytes !== null && newTotalSize > sizeLimitBytes) {
				console.log(
					"[worker:web-crawl] Size limit reached, skipping remaining pages"
				);
				break;
			}

			// Create knowledge entry
			await createKnowledge(db, {
				organizationId,
				websiteId,
				aiAgentId,
				linkSourceId,
				type: "url",
				sourceUrl: page.url,
				sourceTitle: page.title,
				origin: "crawl",
				createdBy,
				payload: {
					markdown: page.markdown,
					headings: [],
					links: [],
					images: [],
					estimatedTokens: Math.ceil(page.markdown.length / 4),
				},
				metadata: {
					source: "firecrawl",
				},
				sizeBytes: page.sizeBytes,
				isIncluded: true,
			});

			totalSizeBytes += page.sizeBytes;
			crawledPagesCount++;
		}

		await job.updateProgress(95);

		// 10. Update link source with results
		const now = new Date().toISOString();
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "completed",
			crawledPagesCount,
			totalSizeBytes,
			lastCrawledAt: now,
			errorMessage: null,
		});

		console.log(
			`[worker:web-crawl] Processed ${crawledPagesCount} pages (${totalSizeBytes} bytes) for link source ${linkSourceId}`
		);
	} else {
		// No pages found
		const now = new Date().toISOString();
		await updateLinkSource(db, {
			id: linkSourceId,
			websiteId,
			status: "completed",
			crawledPagesCount: 0,
			totalSizeBytes: 0,
			lastCrawledAt: now,
			errorMessage: null,
		});

		console.log(
			`[worker:web-crawl] Crawl completed with no pages for link source ${linkSourceId}`
		);
	}

	await job.updateProgress(100);
}
