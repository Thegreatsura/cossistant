// Queue names registry
export const QUEUE_NAMES = {
	MESSAGE_NOTIFICATION: "message-notification",
	AI_REPLY: "ai-reply",
	WEB_CRAWL: "web-crawl",
} as const;

/**
 * Direction of the message notification
 */
export type MessageNotificationDirection =
	| "member-to-visitor"
	| "visitor-to-member";

/**
 * Job data for message notification queue
 */
export type MessageNotificationJobData = {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	direction: MessageNotificationDirection;
	senderId?: string;
	visitorId?: string;
	initialMessageCreatedAt: string;
};

/**
 * Generate a unique job ID for message notification
 */
export function generateMessageNotificationJobId(
	conversationId: string,
	direction: MessageNotificationDirection
): string {
	return `msg-notif-${conversationId}-${direction}`;
}

/**
 * Job data for AI reply queue
 */
export type AiReplyJobData = {
	conversationId: string;
	messageId: string;
	messageCreatedAt: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
	aiAgentId: string;
	workflowRunId: string;
	isReplacement: boolean;
};

export function generateAiReplyJobId(conversationId: string): string {
	return `ai-reply-${conversationId}`;
}

/** Sitemap handling mode for Firecrawl v2 */
export type FirecrawlSitemapMode = "include" | "exclude" | "only";

/**
 * Job data for web crawl queue
 */
export type WebCrawlJobData = {
	linkSourceId: string;
	websiteId: string;
	organizationId: string;
	aiAgentId: string | null;
	url: string;
	crawlLimit: number;
	createdBy: string; // userId who triggered
	// Path filters
	includePaths?: string[] | null;
	excludePaths?: string[] | null;
	// Firecrawl v2 parameters
	/** Maximum depth for link discovery (v2) - default: 5 */
	maxDiscoveryDepth?: number;
	/** Sitemap handling: "include" (default), "exclude", or "only" */
	sitemap?: FirecrawlSitemapMode;
	/** Whether to crawl the entire domain - default: true */
	crawlEntireDomain?: boolean;
	/** @deprecated Use maxDiscoveryDepth instead */
	maxDepth?: number;
};

/**
 * Generate a unique job ID for web crawl
 */
export function generateWebCrawlJobId(linkSourceId: string): string {
	return `web-crawl-${linkSourceId}`;
}
