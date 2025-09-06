import { visitor } from "@api/db/schema/website";
import {
	safelyExtractRequestData,
	validateResponse,
} from "@api/utils/validate";
import {
	type UpdateVisitorRequest,
	updateVisitorRequestSchema,
	type VisitorResponse,
	visitorResponseSchema,
} from "@cossistant/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import { protectedPublicApiKeyMiddleware } from "../middleware";
import type { RestContext } from "../types";

export const visitorRouter = new OpenAPIHono<RestContext>();

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
			const db = c.get("db");
			const apiKey = c.get("apiKey");
			const visitorId = c.req.param("id");
			const data = await safelyExtractRequestData(
				c,
				updateVisitorRequestSchema
			);

			if (!apiKey?.websiteId) {
				return c.json(
					{ error: "UNAUTHORIZED", message: "Invalid API key" },
					401
				);
			}

			// Check if visitor exists
			const [existingVisitor] = await db
				.select()
				.from(visitor)
				.where(
					and(
						eq(visitor.id, visitorId),
						eq(visitor.websiteId, apiKey.websiteId)
					)
				)
				.limit(1);

			if (!existingVisitor) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			// Update existing visitor
			const now = new Date();
			const [updatedVisitor] = await db
				.update(visitor)
				.set({
					...data,
					lastSeenAt: now,
					updatedAt: now,
				})
				.where(eq(visitor.id, visitorId))
				.returning();

			const visitorRecord = updatedVisitor;

			// Format response
			const response = {
				id: visitorRecord.id,
				externalId: visitorRecord.externalId,
				name: visitorRecord.name,
				email: visitorRecord.email,
				browser: visitorRecord.browser,
				browserVersion: visitorRecord.browserVersion,
				os: visitorRecord.os,
				osVersion: visitorRecord.osVersion,
				device: visitorRecord.device,
				deviceType: visitorRecord.deviceType,
				ip: visitorRecord.ip,
				city: visitorRecord.city,
				region: visitorRecord.region,
				country: visitorRecord.country,
				countryCode: visitorRecord.countryCode,
				latitude: visitorRecord.latitude,
				longitude: visitorRecord.longitude,
				language: visitorRecord.language,
				timezone: visitorRecord.timezone,
				screenResolution: visitorRecord.screenResolution,
				viewport: visitorRecord.viewport,
				metadata: visitorRecord.metadata,
				createdAt: visitorRecord.createdAt.toISOString(),
				updatedAt: visitorRecord.updatedAt.toISOString(),
				lastSeenAt: visitorRecord.lastSeenAt?.toISOString() || null,
			};

			return c.json(
				validateResponse(response, visitorResponseSchema, c.req.url),
				200
			);
		} catch (error) {
			console.error("Error upserting visitor:", error);
			return c.json(
				{
					error: "INTERNAL_SERVER_ERROR",
					message: "Failed to upsert visitor information",
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
		},
		security: [
			{
				"Public API Key": [],
			},
		],
	},
	async (c) => {
		try {
			const db = c.get("db");
			const apiKey = c.get("apiKey");
			const visitorId = c.req.param("id");

			if (!apiKey?.websiteId) {
				return c.json(
					{ error: "UNAUTHORIZED", message: "Invalid API key" },
					401
				);
			}

			const [visitorRecord] = await db
				.select()
				.from(visitor)
				.where(
					and(
						eq(visitor.id, visitorId),
						eq(visitor.websiteId, apiKey.websiteId)
					)
				)
				.limit(1);

			if (!visitorRecord) {
				return c.json(
					{ error: "NOT_FOUND", message: "Visitor not found" },
					404
				);
			}

			const response = {
				id: visitorRecord.id,
				externalId: visitorRecord.externalId,
				name: visitorRecord.name,
				email: visitorRecord.email,
				browser: visitorRecord.browser,
				browserVersion: visitorRecord.browserVersion,
				os: visitorRecord.os,
				osVersion: visitorRecord.osVersion,
				device: visitorRecord.device,
				deviceType: visitorRecord.deviceType,
				ip: visitorRecord.ip,
				city: visitorRecord.city,
				region: visitorRecord.region,
				country: visitorRecord.country,
				countryCode: visitorRecord.countryCode,
				latitude: visitorRecord.latitude,
				longitude: visitorRecord.longitude,
				language: visitorRecord.language,
				timezone: visitorRecord.timezone,
				screenResolution: visitorRecord.screenResolution,
				viewport: visitorRecord.viewport,
				metadata: visitorRecord.metadata,
				createdAt: visitorRecord.createdAt.toISOString(),
				updatedAt: visitorRecord.updatedAt.toISOString(),
				lastSeenAt: visitorRecord.lastSeenAt?.toISOString() || null,
			};

			return c.json(
				validateResponse(response, visitorResponseSchema, c.req.url),
				200
			);
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
