/**
 * Geo and Device Data Helpers
 *
 * Extract geo location and device information from visitorRecord records
 * for analytics tracking.
 */

import type { visitorRecord } from "@api/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type VisitorRecord = InferSelectModel<typeof visitorRecord>;

export type GeoData = {
	countryCode?: string;
	city?: string;
	latitude?: number;
	longitude?: number;
};

export type DeviceData = {
	deviceType?: string;
	browser?: string;
};

/**
 * Extract geo location data from a visitorRecord record
 */
export function extractGeoFromVisitor(
	record: VisitorRecord | null | undefined
): GeoData | undefined {
	if (!record) {
		return;
	}

	const hasGeoData =
		record.countryCode || record.city || record.latitude || record.longitude;

	if (!hasGeoData) {
		return;
	}

	return {
		countryCode: record.countryCode ?? undefined,
		city: record.city ?? undefined,
		latitude: record.latitude ?? undefined,
		longitude: record.longitude ?? undefined,
	};
}

/**
 * Extract device information from a visitorRecord record
 */
export function extractDeviceFromVisitor(
	record: VisitorRecord | null | undefined
): DeviceData | undefined {
	if (!record) {
		return;
	}

	const hasDeviceData = record.deviceType || record.browser;

	if (!hasDeviceData) {
		return;
	}

	return {
		deviceType: record.deviceType ?? undefined,
		browser: record.browser ?? undefined,
	};
}

/**
 * Extract session ID from visitorRecord record (uses visitorRecord ID as fallback)
 */
export function getSessionId(record: VisitorRecord | null | undefined): string {
	return record?.sessionId ?? record?.id ?? "unknown";
}
