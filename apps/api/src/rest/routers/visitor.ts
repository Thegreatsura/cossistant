import type { VisitorRecord } from "@api/db/queries/visitor";
import {
	findVisitorForWebsite,
	mergeVisitorMetadataForWebsite,
	updateVisitorForWebsite,
} from "@api/db/queries/visitor";
import {
	safelyExtractRequestData,
	validateResponse,
} from "@api/utils/validate";
import {
	type UpdateVisitorRequest,
	updateVisitorMetadataRequestSchema,
	updateVisitorRequestSchema,
	type VisitorResponse,
	visitorResponseSchema,
} from "@cossistant/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import { protectedPublicApiKeyMiddleware } from "../middleware";
import type { RestContext } from "../types";

export const visitorRouter = new OpenAPIHono<RestContext>();

function formatVisitorResponse(record: VisitorRecord): VisitorResponse {
	return {
		id: record.id,
		externalId: record.externalId,
		name: record.name,
		email: record.email,
		avatar: record.image ?? null,
		browser: record.browser,
		browserVersion: record.browserVersion,
		os: record.os,
		osVersion: record.osVersion,
		device: record.device,
		deviceType: record.deviceType,
		ip: record.ip,
		city: record.city,
		region: record.region,
		country: record.country,
		countryCode: record.countryCode,
		latitude: record.latitude,
		longitude: record.longitude,
		language: record.language,
		timezone: record.timezone,
		screenResolution: record.screenResolution,
		viewport: record.viewport,
		metadata: (record.metadata ?? null) as VisitorResponse["metadata"],
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		lastSeenAt: record.lastSeenAt ?? null,
		websiteId: record.websiteId,
		organizationId: record.organizationId,
	};
}

function getHeaderValue(
	request: Context<RestContext>["req"],
	name: string
): string | null {
	return request.header(name) ?? null;
}

function pickFirstHeader(values: Array<string | null>): string | null {
	return values.find((value) => value && value.trim().length > 0) ?? null;
}

function parsePreferredLocale(headerValue: string | null): string | null {
	if (!headerValue) {
		return null;
	}
	return headerValue.split(",").at(0) ?? null;
}

function parseCoordinate(value: string | null): number | null {
	if (!value) {
		return null;
	}
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function inferCityFromTimezoneHeader(timezone: string | null): string | null {
	if (!timezone?.includes("/")) {
		return null;
	}
	const [, city] = timezone.split("/");
	return city ? city.replace(/_/g, " ") : null;
}

function setIfPresent<T extends keyof UpdateVisitorRequest>(
	target: Partial<UpdateVisitorRequest>,
	key: T,
	value: UpdateVisitorRequest[T] | null | undefined
): void {
	if (value !== null && value !== undefined) {
		target[key] = value;
	}
}

function getEdgeIp(request: Context<RestContext>["req"]): string | null {
	const header = (name: string) => getHeaderValue(request, name);
	const forwardedFor = header("x-forwarded-for");
	const primaryForwarded = forwardedFor?.split(",").at(0)?.trim() ?? null;
	return pickFirstHeader([
		header("cf-connecting-ip"),
		header("x-real-ip"),
		header("x-client-ip"),
		header("fastly-client-ip"),
		header("true-client-ip"),
		header("x-cluster-client-ip"),
		primaryForwarded,
	]);
}

function getEdgeLocation(request: Context<RestContext>["req"]): {
	city: string | null;
	region: string | null;
	countryCode: string | null;
} {
	const header = (name: string) => getHeaderValue(request, name);
	return {
		city: pickFirstHeader([header("cf-ipcity"), header("x-vercel-ip-city")]),
		region: pickFirstHeader([
			header("cf-ipregion"),
			header("x-vercel-ip-country-region"),
		]),
		countryCode: pickFirstHeader([
			header("cf-ipcountry"),
			header("x-vercel-ip-country"),
		]),
	};
}

function getEdgeCoordinates(request: Context<RestContext>["req"]): {
	latitude: number | null;
	longitude: number | null;
} {
	const latitudeSource = pickFirstHeader([
		getHeaderValue(request, "cf-iplatitude"),
		getHeaderValue(request, "x-vercel-ip-latitude"),
	]);
	const longitudeSource = pickFirstHeader([
		getHeaderValue(request, "cf-iplongitude"),
		getHeaderValue(request, "x-vercel-ip-longitude"),
	]);
	return {
		latitude: parseCoordinate(latitudeSource),
		longitude: parseCoordinate(longitudeSource),
	};
}

function extractNetworkContext(
	request: Context<RestContext>["req"]
): Partial<UpdateVisitorRequest> {
	const header = (name: string) => getHeaderValue(request, name);
	const ip = getEdgeIp(request);
	const { city, region, countryCode } = getEdgeLocation(request);
	const { latitude, longitude } = getEdgeCoordinates(request);
	const preferredLocale = parsePreferredLocale(header("accept-language"));

	const networkContext: Partial<UpdateVisitorRequest> = {};

	setIfPresent(networkContext, "ip", ip);
	setIfPresent(networkContext, "city", city);
	setIfPresent(networkContext, "region", region);

	if (countryCode) {
		networkContext.countryCode = countryCode.toUpperCase();
	}
	// Country name is only reliable when provided by edge headers.
	// Attempt a display name when a code exists to enrich analytics, but avoid guesses otherwise.
	if (countryCode && typeof Intl.DisplayNames !== "undefined") {
		try {
			const display = new Intl.DisplayNames([preferredLocale || "en"], {
				type: "region",
			});
			networkContext.country =
				display.of(countryCode.toUpperCase()) ?? networkContext.country;
		} catch (_error) {
			// Ignore failures silently
		}
	}

	setIfPresent(networkContext, "latitude", latitude);
	setIfPresent(networkContext, "longitude", longitude);

	if (!networkContext.language && preferredLocale) {
		networkContext.language = preferredLocale;
	}

	if (!networkContext.city) {
		const timezoneHeader = header("x-vercel-ip-timezone");
		const inferredCity = inferCityFromTimezoneHeader(timezoneHeader);
		setIfPresent(networkContext, "city", inferredCity);
		if (networkContext.region === undefined || networkContext.region === null) {
			setIfPresent(networkContext, "region", inferredCity);
		}
	}
	return networkContext;
}

visitorRouter.use("/*", ...protectedPublicApiKeyMiddleware);

// PATCH /visitors/:id - Update existing visitor information
visitorRouter.openapi(
	{
		method: "patch",
		path: "/:id",
		summary: "Update existing visitor information",
		description:
			"Updates an existing visitor's browser, device, and location data. The visitor must already exist in the system.",
		parameters: [
			{
				name: "id",
				in: "path",
				required: true,
				description: "The visitor ID to update",
				schema: {
					type: "string",
				},
			},
		],
		request: {
			body: {
				content: {
					"application/json": {
						schema: updateVisitorRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				content: {
					"application/json": {
						schema: visitorResponseSchema,
					},
				},
				description: "Visitor information successfully created or updated",
			},
			400: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Invalid request data",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized - Invalid API key",
			},
			404: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Visitor not found",
			},
			500: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Internal server error",
			},
		},
		security: [
			{
				"Public API Key": [],
			},
		],
	},
	async (c) => {
		try {
			const { db, website, body } = await safelyExtractRequestData(
				c,
				updateVisitorRequestSchema
			);
			const visitorId = c.req.param("id");

			if (!visitorId) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			if (!website?.id) {
				return c.json(
					{ error: "UNAUTHORIZED", message: "Invalid API key" },
					401
				);
			}

			const now = new Date();
			const networkContext = extractNetworkContext(c.req);
			const updatedVisitor = await updateVisitorForWebsite(db, {
				visitorId,
				websiteId: website.id,
				data: {
					...body,
					...networkContext,
					lastSeenAt: now,
					updatedAt: now,
				},
			});

			if (!updatedVisitor) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			const response = formatVisitorResponse(updatedVisitor);

			return c.json(validateResponse(response, visitorResponseSchema), 200);
		} catch (error) {
			console.error("Error updating visitor:", error);
			return c.json(
				{
					error: "INTERNAL_SERVER_ERROR",
					message: "Failed to update visitor information",
				},
				500
			);
		}
	}
);

// PATCH /visitors/:id/metadata - Update visitor metadata only
visitorRouter.openapi(
	{
		method: "patch",
		path: "/:id/metadata",
		summary: "Update visitor metadata",
		description: "Merges the provided metadata into the visitor profile.",
		parameters: [
			{
				name: "id",
				in: "path",
				required: true,
				description: "The visitor ID to update",
				schema: {
					type: "string",
				},
			},
		],
		request: {
			body: {
				content: {
					"application/json": {
						schema: updateVisitorMetadataRequestSchema,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Visitor metadata updated successfully",
				content: {
					"application/json": {
						schema: visitorResponseSchema,
					},
				},
			},
			400: {
				description: "Invalid request data",
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
			},
			401: {
				description: "Unauthorized - Invalid API key",
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
			},
			404: {
				description: "Visitor not found",
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
			},
			500: {
				description: "Internal server error",
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
			},
		},
		security: [
			{
				"Public API Key": [],
			},
		],
	},
	async (c) => {
		try {
			const { db, website, body } = await safelyExtractRequestData(
				c,
				updateVisitorMetadataRequestSchema
			);
			const visitorId = c.req.param("id");

			if (!visitorId) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			if (!website?.id) {
				return c.json(
					{ error: "UNAUTHORIZED", message: "Invalid API key" },
					401
				);
			}

			const updatedVisitor = await mergeVisitorMetadataForWebsite(db, {
				visitorId,
				websiteId: website.id,
				metadata: body.metadata,
			});

			if (!updatedVisitor) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			const response = formatVisitorResponse(updatedVisitor);

			return c.json(validateResponse(response, visitorResponseSchema), 200);
		} catch (error) {
			console.error("Error updating visitor metadata:", error);
			return c.json(
				{
					error: "INTERNAL_SERVER_ERROR",
					message: "Failed to update visitor metadata",
				},
				500
			);
		}
	}
);

// GET /visitors/:id - Get visitor information by ID
visitorRouter.openapi(
	{
		method: "get",
		path: "/:id",
		summary: "Get visitor information",
		description: "Retrieves visitor information by visitor ID",
		parameters: [
			{
				name: "id",
				in: "path",
				required: true,
				description: "The visitor ID",
				schema: {
					type: "string",
				},
			},
		],
		responses: {
			200: {
				content: {
					"application/json": {
						schema: visitorResponseSchema,
					},
				},
				description: "Visitor information retrieved successfully",
			},
			404: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Visitor not found",
			},
			401: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Unauthorized - Invalid API key",
			},
			500: {
				content: {
					"application/json": {
						schema: z.object({
							error: z.string(),
							message: z.string(),
						}),
					},
				},
				description: "Internal server error",
			},
		},
		security: [
			{
				"Public API Key": [],
			},
		],
	},
	async (c) => {
		try {
			const { db, website } = await safelyExtractRequestData(c);
			const visitorId = c.req.param("id");

			if (!visitorId) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			if (!website?.id) {
				return c.json(
					{ error: "UNAUTHORIZED", message: "Invalid API key" },
					401
				);
			}

			const visitorRecord = await findVisitorForWebsite(db, {
				visitorId,
				websiteId: website.id,
			});

			if (!visitorRecord) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			const response = formatVisitorResponse(visitorRecord);

			return c.json(validateResponse(response, visitorResponseSchema), 200);
		} catch (error) {
			console.error("Error fetching visitor:", error);
			return c.json(
				{
					error: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch visitor information",
				},
				500
			);
		}
	}
);
