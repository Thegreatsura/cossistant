import type { Database } from "@api/db";
import { and, eq, gte, isNotNull, isNull, lt, sql } from "@api/db";
import { conversation, visitor } from "@api/db/schema";

export type AnalyticsRange = {
	start: string;
	end: string;
};

export type InboxAnalyticsMetrics = {
	medianResponseTimeSeconds: number | null;
	medianResolutionTimeSeconds: number | null;
	aiHandledRate: number | null;
	satisfactionIndex: number | null;
	uniqueVisitors: number;
};

const toNumberOrNull = (value: unknown): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export async function getInboxAnalyticsMetrics(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		range: AnalyticsRange;
	}
): Promise<InboxAnalyticsMetrics> {
	const { organizationId, websiteId, range } = params;

	const responseTimeSeconds = sql<number>`
		EXTRACT(EPOCH FROM (${conversation.firstResponseAt}::timestamptz - ${conversation.startedAt}::timestamptz))
	`;

	const resolutionTimeSeconds = sql<number>`
		COALESCE(
			${conversation.resolutionTime},
			EXTRACT(EPOCH FROM (${conversation.resolvedAt}::timestamptz - ${conversation.startedAt}::timestamptz))
		)
	`;

	const ratingScore = sql<number>`((${conversation.visitorRating} - 1) / 4.0) * 100`;
	const sentimentBase = sql<number>`
		CASE
			WHEN ${conversation.sentiment} = 'positive' THEN 100
			WHEN ${conversation.sentiment} = 'negative' THEN 0
			ELSE 50
		END
	`;
	const sentimentScore = sql<number>`
		50 + (${sentimentBase} - 50) * COALESCE(${conversation.sentimentConfidence}, 1)
	`;
	const timelinessScore = sql<number>`
		CASE
			WHEN ${resolutionTimeSeconds} <= 3600 THEN 100
			WHEN ${resolutionTimeSeconds} <= 86400 THEN 70
			ELSE 40
		END
	`;
	const satisfactionScore = sql<number>`
		0.6 * ${ratingScore} + 0.25 * ${sentimentScore} + 0.15 * ${timelinessScore}
	`;

	const [
		medianResponse,
		medianResolution,
		resolutionCounts,
		satisfaction,
		uniqueVisitors,
	] = await Promise.all([
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
		db
			.select({
				total: sql<number>`COUNT(*)`,
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
					isNotNull(conversation.resolvedAt),
					gte(conversation.resolvedAt, range.start),
					lt(conversation.resolvedAt, range.end)
				)
			),
		db
			.select({
				average: sql<number | null>`AVG(${satisfactionScore})`,
			})
			.from(conversation)
			.where(
				and(
					eq(conversation.organizationId, organizationId),
					eq(conversation.websiteId, websiteId),
					isNull(conversation.deletedAt),
					isNotNull(conversation.visitorRating),
					isNotNull(conversation.visitorRatingAt),
					isNotNull(conversation.resolvedAt),
					isNotNull(conversation.startedAt),
					gte(conversation.visitorRatingAt, range.start),
					lt(conversation.visitorRatingAt, range.end)
				)
			),
		db
			.select({
				total: sql<number>`
					COUNT(DISTINCT COALESCE(${visitor.contactId}, ${visitor.id}))
				`,
			})
			.from(visitor)
			.where(
				and(
					eq(visitor.organizationId, organizationId),
					eq(visitor.websiteId, websiteId),
					isNull(visitor.deletedAt),
					eq(visitor.isTest, false),
					isNotNull(visitor.lastSeenAt),
					gte(visitor.lastSeenAt, range.start),
					lt(visitor.lastSeenAt, range.end)
				)
			),
	]);

	const medianResponseTimeSeconds = toNumberOrNull(medianResponse[0]?.median);
	const medianResolutionTimeSeconds = toNumberOrNull(
		medianResolution[0]?.median
	);
	const totalResolved = Number(resolutionCounts[0]?.total ?? 0);
	const aiResolved = Number(resolutionCounts[0]?.aiResolved ?? 0);
	const aiHandledRate =
		totalResolved > 0 ? (aiResolved / totalResolved) * 100 : null;
	const satisfactionIndex = toNumberOrNull(satisfaction[0]?.average);
	const uniqueVisitorsCount = Number(uniqueVisitors[0]?.total ?? 0);

	return {
		medianResponseTimeSeconds,
		medianResolutionTimeSeconds,
		aiHandledRate,
		satisfactionIndex,
		uniqueVisitors: uniqueVisitorsCount,
	};
}
