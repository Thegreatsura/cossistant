/**
 * Inbox Analytics with Tinybird
 *
 * Hybrid approach:
 * - Time-series metrics (response time, resolution time, AI rate, unique visitors) from Tinybird
 * - Ratings and sentiment from PostgreSQL (low volume, relational)
 */

import type { Database } from "@api/db";
import { and, eq, gte, isNotNull, isNull, lt, sql } from "@api/db";
import { conversation, feedback } from "@api/db/schema";
import {
	queryInboxAnalytics,
	queryUniqueVisitors,
} from "@api/lib/tinybird-sdk";

export type AnalyticsRange = {
	start: string;
	end: string;
};

export type InboxAnalyticsMetrics = {
	medianResponseTimeSeconds: number | null;
	medianResolutionTimeSeconds: number | null;
	aiHandledRate: number | null;
	satisfactionIndex: number;
	uniqueVisitors: number;
};

// Default score when no data is available (represents neutral baseline)
const DEFAULT_SATISFACTION_SCORE = 50;

// Weights for satisfaction formula components
const WEIGHTS = {
	rating: 0.4,
	sentiment: 0.25,
	responseTime: 0.2,
	resolution: 0.15,
};

const toNumberOrNull = (value: unknown): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Calculate response time score based on median response time
 * Faster responses = higher score
 */
function calculateResponseTimeScore(
	medianSeconds: number | null
): number | null {
	if (medianSeconds === null) {
		return null;
	}

	if (medianSeconds <= 300) {
		return 100; // ≤5 min
	}
	if (medianSeconds <= 900) {
		return 85; // ≤15 min
	}
	if (medianSeconds <= 3600) {
		return 70; // ≤1 hour
	}
	if (medianSeconds <= 14_400) {
		return 50; // ≤4 hours
	}
	if (medianSeconds <= 86_400) {
		return 30; // ≤24 hours
	}
	return 10; // >24 hours
}

/**
 * Calculate composite satisfaction index from multiple signals
 * Uses fallback to default score when individual signals are missing
 */
function calculateSatisfactionIndex(scores: {
	ratingScore: number | null;
	sentimentScore: number | null;
	responseTimeScore: number | null;
	resolutionScore: number | null;
}): number {
	const rating = scores.ratingScore ?? DEFAULT_SATISFACTION_SCORE;
	const sentiment = scores.sentimentScore ?? DEFAULT_SATISFACTION_SCORE;
	const responseTime = scores.responseTimeScore ?? DEFAULT_SATISFACTION_SCORE;
	const resolution = scores.resolutionScore ?? DEFAULT_SATISFACTION_SCORE;

	return (
		WEIGHTS.rating * rating +
		WEIGHTS.sentiment * sentiment +
		WEIGHTS.responseTime * responseTime +
		WEIGHTS.resolution * resolution
	);
}

/**
 * Get inbox analytics metrics using Tinybird for time-series data
 * and PostgreSQL for ratings/sentiment.
 */
export async function getInboxAnalyticsMetrics(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		range: AnalyticsRange;
		isTestMode?: boolean;
	}
): Promise<InboxAnalyticsMetrics> {
	const { organizationId, websiteId, range } = params;

	// Fetch time-series metrics from Tinybird and ratings/sentiment from PostgreSQL in parallel
	const [tinybirdMetrics, uniqueVisitorsResult, ratingResult, sentimentResult] =
		await Promise.all([
			// Tinybird: response time, resolution time, AI rate
			queryInboxAnalytics({
				website_id: websiteId,
				date_from: range.start,
				date_to: range.end,
				prev_date_from: range.start, // Not used here, but pipe requires it
				prev_date_to: range.end,
			}),

			// Tinybird: unique visitors
			queryUniqueVisitors({
				website_id: websiteId,
				date_from: range.start,
				date_to: range.end,
				prev_date_from: range.start, // Not used here
				prev_date_to: range.end,
			}),

			// PostgreSQL: average feedback rating
			db
				.select({
					average: sql<
						number | null
					>`AVG(((${feedback.rating} - 1) / 4.0) * 100)`,
					count: sql<number>`COUNT(*)`,
				})
				.from(feedback)
				.where(
					and(
						eq(feedback.organizationId, organizationId),
						eq(feedback.websiteId, websiteId),
						isNull(feedback.deletedAt),
						gte(feedback.createdAt, range.start),
						lt(feedback.createdAt, range.end)
					)
				),

			// PostgreSQL: average sentiment score
			db
				.select({
					average: sql<number | null>`
						AVG(
							50 + (
								CASE
									WHEN ${conversation.sentiment} = 'positive' THEN 50
									WHEN ${conversation.sentiment} = 'negative' THEN -50
									ELSE 0
								END
							) * COALESCE(${conversation.sentimentConfidence}, 1)
						)
					`,
					count: sql<number>`COUNT(*)`,
				})
				.from(conversation)
				.where(
					and(
						eq(conversation.organizationId, organizationId),
						eq(conversation.websiteId, websiteId),
						isNull(conversation.deletedAt),
						isNotNull(conversation.sentiment),
						gte(conversation.startedAt, range.start),
						lt(conversation.startedAt, range.end)
					)
				),
		]);

	// Parse Tinybird results
	const currentPeriodData = tinybirdMetrics.data.filter(
		(row) => row.period === "current"
	);

	// Extract metrics from Tinybird
	const firstResponseRow = currentPeriodData.find(
		(row) => row.event_type === "first_response"
	);
	const conversationResolvedRow = currentPeriodData.find(
		(row) => row.event_type === "conversation_resolved"
	);
	const aiResolvedRow = currentPeriodData.find(
		(row) => row.event_type === "ai_resolved"
	);

	const medianResponseTimeSeconds = toNumberOrNull(
		firstResponseRow?.median_duration
	);
	const medianResolutionTimeSeconds = toNumberOrNull(
		conversationResolvedRow?.median_duration
	);

	// AI handled rate: ai_resolved / conversation_resolved
	const totalResolved = Number(conversationResolvedRow?.event_count ?? 0);
	const aiResolved = Number(aiResolvedRow?.event_count ?? 0);
	const aiHandledRate =
		totalResolved > 0 ? (aiResolved / totalResolved) * 100 : null;

	// Resolution score: For satisfaction index, we need to know % resolved
	// This requires knowing total conversations started, which we can get from Tinybird
	const conversationStartedRow = currentPeriodData.find(
		(row) => row.event_type === "conversation_started"
	);
	const totalConversations = Number(
		conversationStartedRow?.event_count ?? totalResolved
	);
	const resolutionScore =
		totalConversations > 0 ? (totalResolved / totalConversations) * 100 : null;

	// Unique visitors from Tinybird
	const currentVisitors = uniqueVisitorsResult.data.find(
		(row) => row.period === "current"
	);
	const uniqueVisitorsCount = Number(currentVisitors?.unique_visitors ?? 0);

	// Rating score from PostgreSQL
	const ratingCount = Number(ratingResult[0]?.count ?? 0);
	const ratingScore =
		ratingCount > 0 ? toNumberOrNull(ratingResult[0]?.average) : null;

	// Sentiment score from PostgreSQL
	const sentimentCount = Number(sentimentResult[0]?.count ?? 0);
	const avgSentimentScore =
		sentimentCount > 0 ? toNumberOrNull(sentimentResult[0]?.average) : null;

	// Response time score
	const responseTimeScore = calculateResponseTimeScore(
		medianResponseTimeSeconds
	);

	// Calculate composite satisfaction index (hybrid: Tinybird + PostgreSQL)
	const satisfactionIndex = calculateSatisfactionIndex({
		ratingScore,
		sentimentScore: avgSentimentScore,
		responseTimeScore,
		resolutionScore,
	});

	return {
		medianResponseTimeSeconds,
		medianResolutionTimeSeconds,
		aiHandledRate,
		satisfactionIndex,
		uniqueVisitors: uniqueVisitorsCount,
	};
}
