import type { Database } from "@api/db";
import { visitor } from "@api/db/schema";
import { generateULID } from "@api/utils/db/ids";
import { eq } from "drizzle-orm";

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
