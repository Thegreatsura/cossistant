import type { Database } from "@api/db";
import { visitor } from "@api/db/schema";
import { generateULID } from "@api/utils/db/ids";
import { and, eq } from "drizzle-orm";

export type VisitorRecord = typeof visitor.$inferSelect;
type VisitorInsert = typeof visitor.$inferInsert;

export async function upsertVisitor(
	db: Database,
	params: {
		websiteId: string;
		organizationId: string;
		visitorId?: string | null;
		visitorData?: {
			browser?: string | null;
			browserVersion?: string | null;
			os?: string | null;
			osVersion?: string | null;
			device?: string | null;
			deviceType?: string | null;
			language?: string | null;
			timezone?: string | null;
			screenResolution?: string | null;
			viewport?: string | null;
			ip?: string | null;
			city?: string | null;
			region?: string | null;
			country?: string | null;
			countryCode?: string | null;
			latitude?: number | null;
			longitude?: number | null;
		};
	}
) {
	const visitorId = params.visitorId ?? generateULID();
	const now = new Date();

	// Base values for insert/update
	const baseValues = {
		id: visitorId,
		websiteId: params.websiteId,
		organizationId: params.organizationId,
		lastSeenAt: now,
		updatedAt: now,
		...(params.visitorData && {
			browser: params.visitorData.browser,
			browserVersion: params.visitorData.browserVersion,
			os: params.visitorData.os,
			osVersion: params.visitorData.osVersion,
			device: params.visitorData.device,
			deviceType: params.visitorData.deviceType,
			language: params.visitorData.language,
			timezone: params.visitorData.timezone,
			screenResolution: params.visitorData.screenResolution,
			viewport: params.visitorData.viewport,
			ip: params.visitorData.ip,
			city: params.visitorData.city,
			region: params.visitorData.region,
			country: params.visitorData.country,
			countryCode: params.visitorData.countryCode,
			latitude: params.visitorData.latitude,
			longitude: params.visitorData.longitude,
		}),
	};

	// Update values - same as base but without id, websiteId, organizationId
	const updateValues = {
		lastSeenAt: now,
		updatedAt: now,
		...(params.visitorData && {
			browser: params.visitorData.browser,
			browserVersion: params.visitorData.browserVersion,
			os: params.visitorData.os,
			osVersion: params.visitorData.osVersion,
			device: params.visitorData.device,
			deviceType: params.visitorData.deviceType,
			language: params.visitorData.language,
			timezone: params.visitorData.timezone,
			screenResolution: params.visitorData.screenResolution,
			viewport: params.visitorData.viewport,
			ip: params.visitorData.ip,
			city: params.visitorData.city,
			region: params.visitorData.region,
			country: params.visitorData.country,
			countryCode: params.visitorData.countryCode,
			latitude: params.visitorData.latitude,
			longitude: params.visitorData.longitude,
		}),
	};

	const [newVisitor] = await db
		.insert(visitor)
		.values(baseValues)
		.onConflictDoUpdate({
			target: visitor.id,
			set: updateValues,
		})
		.returning();

	return newVisitor;
}

export async function getVisitor(
	db: Database,
	params: {
		visitorId?: string | null;
		externalVisitorId?: string | null;
	}
) {
	if (!(params.visitorId || params.externalVisitorId)) {
		return;
	}

	const query = params.visitorId
		? eq(visitor.id, params.visitorId)
		: params.externalVisitorId
			? eq(visitor.externalId, params.externalVisitorId)
			: null;

	// Safety net, means we didn't
	if (!query) {
		return;
	}

	const _visitor = await db.query.visitor
		.findFirst({
			where: query,
		})
		.execute();

	return _visitor;
}

export async function getVisitorComplete(
	db: Database,
	params: {
		visitorId: string;
	}
) {
	const _visitor = await db.query.visitor.findFirst({
		where: eq(visitor.id, params.visitorId),
	});

	return _visitor;
}

export async function findVisitorForWebsite(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
	}
): Promise<VisitorRecord | null> {
	const [record] = await db
		.select()
		.from(visitor)
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId)
			)
		)
		.limit(1);

	return record ?? null;
}

export async function updateVisitorForWebsite(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
		data: Partial<VisitorInsert>;
	}
): Promise<VisitorRecord | null> {
	const [updated] = await db
		.update(visitor)
		.set(params.data)
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId)
			)
		)
		.returning();

	return updated ?? null;
}

export async function mergeVisitorMetadataForWebsite(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
		metadata: NonNullable<VisitorInsert["metadata"]>;
		updatedAt?: Date;
	}
): Promise<VisitorRecord | null> {
	const existing = await findVisitorForWebsite(db, {
		visitorId: params.visitorId,
		websiteId: params.websiteId,
	});

	if (!existing) {
		return null;
	}

	const existingMetadata =
		typeof existing.metadata === "object" && existing.metadata !== null
			? (existing.metadata as Record<string, unknown>)
			: {};

	const mergedMetadata = {
		...existingMetadata,
		...params.metadata,
	};

	return updateVisitorForWebsite(db, {
		visitorId: params.visitorId,
		websiteId: params.websiteId,
		data: {
			metadata: mergedMetadata,
			updatedAt: params.updatedAt ?? new Date(),
		},
	});
}
