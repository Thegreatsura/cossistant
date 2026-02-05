import type { Database } from "@api/db";
import { and, eq, gte, isNotNull, isNull, lt, sql } from "@api/db";
import { conversation, feedback, visitor } from "@api/db/schema";

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

export async function getInboxAnalyticsMetrics(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		range: AnalyticsRange;
		isTestMode?: boolean;
	}
): Promise<InboxAnalyticsMetrics> {
	const { organizationId, websiteId, range, isTestMode = false } = params;

	const responseTimeSeconds = sql<number>`
		EXTRACT(EPOCH FROM (${conversation.firstResponseAt}::timestamptz - ${conversation.startedAt}::timestamptz))
	`;

	const resolutionTimeSeconds = sql<number>`
		COALESCE(
			${conversation.resolutionTime},
			EXTRACT(EPOCH FROM (${conversation.resolvedAt}::timestamptz - ${conversation.startedAt}::timestamptz))
		)
	`;

	// Rating score from feedback table: rating 1-5 normalized to 0-100
	const feedbackRatingScore = sql<number>`((${feedback.rating} - 1) / 4.0) * 100`;

	// Sentiment score: positive=100, neutral=50, negative=0, weighted by confidence
	const sentimentScore = sql<number>`
		50 + (
			CASE
				WHEN ${conversation.sentiment} = 'positive' THEN 50
				WHEN ${conversation.sentiment} = 'negative' THEN -50
				ELSE 0
			END
		) * COALESCE(${conversation.sentimentConfidence}, 1)
	`;

	// Build visitor conditions - conditionally include test visitors
	const visitorConditions = [
		eq(visitor.organizationId, organizationId),
		eq(visitor.websiteId, websiteId),
		isNull(visitor.deletedAt),
		isNotNull(visitor.lastSeenAt),
		gte(visitor.lastSeenAt, range.start),
		lt(visitor.lastSeenAt, range.end),
	];

	// Only filter out test visitors when NOT in test mode
	if (!isTestMode) {
		visitorConditions.push(eq(visitor.isTest, false));
	}

	const [
		medianResponse,
		medianResolution,
		resolutionCounts,
		ratingResult,
		sentimentResult,
		uniqueVisitors,
	] = await Promise.all([
		// Median response time
		db
			.select({
				median: sql<number | null>`
					percentile_cont(0.5) WITHIN GROUP (ORDER BY ${responseTimeSeconds})
				`,
			})
			.from(conversation)
			.where(
				and(
					eq(conversation.organizationId, organizationId),
					eq(conversation.websiteId, websiteId),
					isNull(conversation.deletedAt),
					isNotNull(conversation.firstResponseAt),
					isNotNull(conversation.startedAt),
					gte(conversation.startedAt, range.start),
					lt(conversation.startedAt, range.end)
				)
			),

		// Median resolution time
		db
			.select({
				median: sql<number | null>`
					percentile_cont(0.5) WITHIN GROUP (ORDER BY ${resolutionTimeSeconds})
				`,
			})
			.from(conversation)
			.where(
				and(
					eq(conversation.organizationId, organizationId),
					eq(conversation.websiteId, websiteId),
					isNull(conversation.deletedAt),
					isNotNull(conversation.resolvedAt),
					isNotNull(conversation.startedAt),
					gte(conversation.resolvedAt, range.start),
					lt(conversation.resolvedAt, range.end)
				)
			),

		// Resolution counts (for AI handled rate and resolution score)
		db
			.select({
				total: sql<number>`COUNT(*)`,
				resolved: sql<number>`
					SUM(CASE WHEN ${conversation.resolvedAt} IS NOT NULL THEN 1 ELSE 0 END)
				`,
				aiResolved: sql<number>`
					SUM(CASE WHEN ${conversation.resolvedByAiAgentId} IS NOT NULL THEN 1 ELSE 0 END)
				`,
			})
			.from(conversation)
			.where(
				and(
					eq(conversation.organizationId, organizationId),
					eq(conversation.websiteId, websiteId),
					isNull(conversation.deletedAt),
					gte(conversation.startedAt, range.start),
					lt(conversation.startedAt, range.end)
				)
			),

		// Average feedback rating
		db
			.select({
				average: sql<number | null>`AVG(${feedbackRatingScore})`,
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

		// Average sentiment score from conversations
		db
			.select({
				average: sql<number | null>`AVG(${sentimentScore})`,
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

		// Unique visitors
		db
			.select({
				total: sql<number>`
					COUNT(DISTINCT COALESCE(${visitor.contactId}, ${visitor.id}))
				`,
			})
			.from(visitor)
			.where(and(...visitorConditions)),
	]);

	const medianResponseTimeSeconds = toNumberOrNull(medianResponse[0]?.median);
	const medianResolutionTimeSeconds = toNumberOrNull(
		medianResolution[0]?.median
	);

	// AI handled rate
	const totalResolved = Number(resolutionCounts[0]?.resolved ?? 0);
	const aiResolved = Number(resolutionCounts[0]?.aiResolved ?? 0);
	const aiHandledRate =
		totalResolved > 0 ? (aiResolved / totalResolved) * 100 : null;

	// Resolution score: percentage of conversations resolved
	const totalConversations = Number(resolutionCounts[0]?.total ?? 0);
	const resolutionScore =
		totalConversations > 0 ? (totalResolved / totalConversations) * 100 : null;

	// Rating score from feedback
	const ratingCount = Number(ratingResult[0]?.count ?? 0);
	const ratingScore =
		ratingCount > 0 ? toNumberOrNull(ratingResult[0]?.average) : null;

	// Sentiment score from conversations
	const sentimentCount = Number(sentimentResult[0]?.count ?? 0);
	const avgSentimentScore =
		sentimentCount > 0 ? toNumberOrNull(sentimentResult[0]?.average) : null;

	// Response time score
	const responseTimeScore = calculateResponseTimeScore(
		medianResponseTimeSeconds
	);

	// Calculate composite satisfaction index
	const satisfactionIndex = calculateSatisfactionIndex({
		ratingScore,
		sentimentScore: avgSentimentScore,
		responseTimeScore,
		resolutionScore,
	});

	const uniqueVisitorsCount = Number(uniqueVisitors[0]?.total ?? 0);

	return {
		medianResponseTimeSeconds,
		medianResolutionTimeSeconds,
		aiHandledRate,
		satisfactionIndex,
		uniqueVisitors: uniqueVisitorsCount,
	};
}
