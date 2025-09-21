import { z } from "@hono/zod-openapi";

/**
 * Visitor metadata are stored as key value pairs
 * Values can be strings, numbers, booleans, or null
 */
export const visitorMetadataSchema = z.record(
	z.string(),
	z.string().or(z.number()).or(z.boolean()).or(z.null())
);

export type VisitorMetadata = z.infer<typeof visitorMetadataSchema>;

/**
 * Visitor data update request schema
 */
export const updateVisitorRequestSchema = z.object({
	externalId: z
		.string()
		.openapi({
			description:
				"External identifier for the visitor (e.g. from your system).",
			example: "user_12345",
		})
		.optional(),
	name: z
		.string()
		.openapi({
			description: "The visitor's name.",
			example: "John Doe",
		})
		.optional(),
	email: z
		.string()
		.email()
		.openapi({
			description: "The visitor's email address.",
			example: "john.doe@example.com",
		})
		.optional(),
	browser: z
		.string()
		.openapi({
			description: "The visitor's browser.",
			example: "Chrome",
		})
		.optional(),
	browserVersion: z
		.string()
		.openapi({
			description: "The visitor's browser version.",
			example: "120.0.0",
		})
		.optional(),
	os: z
		.string()
		.openapi({
			description: "The visitor's operating system.",
			example: "Windows",
		})
		.optional(),
	osVersion: z
		.string()
		.openapi({
			description: "The visitor's operating system version.",
			example: "11",
		})
		.optional(),
	device: z
		.string()
		.openapi({
			description: "The visitor's device.",
			example: "MacBook Pro",
		})
		.optional(),
	deviceType: z
		.enum(["desktop", "mobile", "tablet", "unknown"])
		.openapi({
			description: "The visitor's device type.",
			example: "desktop",
		})
		.optional(),
	ip: z
		.string()
		.openapi({
			description: "The visitor's IP address.",
			example: "192.168.1.1",
		})
		.optional(),
	city: z
		.string()
		.openapi({
			description: "The visitor's city.",
			example: "San Francisco",
		})
		.optional(),
	region: z
		.string()
		.openapi({
			description: "The visitor's region/state.",
			example: "California",
		})
		.optional(),
	country: z
		.string()
		.openapi({
			description: "The visitor's country.",
			example: "United States",
		})
		.optional(),
	countryCode: z
		.string()
		.max(2)
		.openapi({
			description: "The visitor's country code (ISO 3166-1 alpha-2).",
			example: "US",
		})
		.optional(),
	latitude: z
		.number()
		.openapi({
			description: "The visitor's latitude.",
			example: 37.7749,
		})
		.optional(),
	longitude: z
		.number()
		.openapi({
			description: "The visitor's longitude.",
			example: -122.4194,
		})
		.optional(),
	language: z
		.string()
		.openapi({
			description: "The visitor's preferred language.",
			example: "en-US",
		})
		.optional(),
	timezone: z
		.string()
		.openapi({
			description: "The visitor's timezone.",
			example: "America/Los_Angeles",
		})
		.optional(),
	screenResolution: z
		.string()
		.openapi({
			description: "The visitor's screen resolution.",
			example: "1920x1080",
		})
		.optional(),
	viewport: z
		.string()
		.openapi({
			description: "The visitor's viewport size.",
			example: "1920x900",
		})
		.optional(),
	metadata: visitorMetadataSchema
		.openapi({
			description: "Additional custom metadata for the visitor.",
			example: { plan: "premium", role: "admin" },
		})
		.optional(),
});

export type UpdateVisitorRequest = z.infer<typeof updateVisitorRequestSchema>;

export const updateVisitorMetadataRequestSchema = z.object({
	metadata: visitorMetadataSchema.openapi({
		description: "Metadata payload to merge into the visitor's profile.",
		example: { plan: "premium", role: "admin" },
	}),
});

export type UpdateVisitorMetadataRequest = z.infer<
	typeof updateVisitorMetadataRequestSchema
>;

export const visitorProfileSchema = z.object({
	id: z.string().ulid().openapi({
		description: "The visitor's unique identifier (ULID).",
		example: "01JG000000000000000000000",
	}),
	externalId: z.string().nullable().openapi({
		description: "External identifier for the visitor.",
		example: "user_12345",
	}),
	avatar: z.string().url().nullable().openapi({
		description: "The visitor's avatar URL.",
		example: "https://example.com/avatar.png",
	}),
	name: z.string().nullable().openapi({
		description: "The visitor's name, if provided or identified.",
		example: "John Doe",
	}),
	email: z.string().email().nullable().openapi({
		description: "The visitor's email address, if provided or identified.",
		example: "john.doe@example.com",
	}),
	lastSeenAt: z.date().nullable().openapi({
		description: "When the visitor was last seen.",
		example: "2021-01-01T00:00:00.000Z",
	}),
});

/**
 * Visitor response schema
 */
export const visitorResponseSchema = z.object({
	id: z.string().ulid().openapi({
		description: "The visitor's unique identifier (ULID).",
		example: "01JG000000000000000000000",
	}),
	avatar: z.string().url().nullable().openapi({
		description: "The visitor's avatar URL.",
		example: "https://example.com/avatar.png",
	}),
	externalId: z.string().nullable().openapi({
		description: "External identifier for the visitor.",
		example: "user_12345",
	}),
	name: z.string().nullable().openapi({
		description: "The visitor's name, if provided or identified.",
		example: "John Doe",
	}),
	email: z.string().email().nullable().openapi({
		description: "The visitor's email address, if provided or identified.",
		example: "john.doe@example.com",
	}),
	browser: z.string().nullable().openapi({
		description: "The visitor's browser.",
		example: "Chrome",
	}),
	browserVersion: z.string().nullable().openapi({
		description: "The visitor's browser version.",
		example: "120.0.0",
	}),
	os: z.string().nullable().openapi({
		description: "The visitor's operating system.",
		example: "Windows",
	}),
	osVersion: z.string().nullable().openapi({
		description: "The visitor's operating system version.",
		example: "11",
	}),
	device: z.string().nullable().openapi({
		description: "The visitor's device.",
		example: "MacBook Pro",
	}),
	deviceType: z.string().nullable().openapi({
		description: "The visitor's device type.",
		example: "desktop",
	}),
	ip: z.string().nullable().openapi({
		description: "The visitor's IP address.",
		example: "192.168.1.1",
	}),
	city: z.string().nullable().openapi({
		description: "The visitor's city.",
		example: "San Francisco",
	}),
	region: z.string().nullable().openapi({
		description: "The visitor's region/state.",
		example: "California",
	}),
	country: z.string().nullable().openapi({
		description: "The visitor's country.",
		example: "United States",
	}),
	countryCode: z.string().nullable().openapi({
		description: "The visitor's country code (ISO 3166-1 alpha-2).",
		example: "US",
	}),
	latitude: z.number().nullable().openapi({
		description: "The visitor's latitude.",
		example: 37.7749,
	}),
	longitude: z.number().nullable().openapi({
		description: "The visitor's longitude.",
		example: -122.4194,
	}),
	language: z.string().nullable().openapi({
		description: "The visitor's preferred language.",
		example: "en-US",
	}),
	timezone: z.string().nullable().openapi({
		description: "The visitor's timezone.",
		example: "America/Los_Angeles",
	}),
	screenResolution: z.string().nullable().openapi({
		description: "The visitor's screen resolution.",
		example: "1920x1080",
	}),
	viewport: z.string().nullable().openapi({
		description: "The visitor's viewport size.",
		example: "1920x900",
	}),
	metadata: visitorMetadataSchema.nullable().openapi({
		description: "Additional custom metadata for the visitor.",
		example: { plan: "premium", role: "admin", isAdmin: true, tokenLeft: 10 },
	}),
	createdAt: z.date().openapi({
		description: "When the visitor was first seen.",
		example: "2021-01-01T00:00:00.000Z",
	}),
	updatedAt: z.date().openapi({
		description: "When the visitor record was last updated.",
		example: "2021-01-01T00:00:00.000Z",
	}),
	lastSeenAt: z.date().nullable().openapi({
		description: "When the visitor was last connected or active.",
		example: "2021-01-01T00:00:00.000Z",
	}),
	websiteId: z.string().ulid().openapi({
		description: "The website's unique identifier that the visitor belongs to.",
		example: "01JG000000000000000000000",
	}),
	organizationId: z.string().ulid().openapi({
		description:
			"The organization's unique identifier that the visitor belongs to.",
		example: "01JG000000000000000000000",
	}),
});

export type Visitor = z.infer<typeof visitorResponseSchema>;
export type VisitorResponse = Visitor;

/**
 * Visitor response schema
 */
export const publicVisitorResponseSchema = z.object({
	id: z.string().ulid().openapi({
		description: "The visitor's unique identifier (ULID).",
		example: "01JG000000000000000000000",
	}),
	externalId: z.string().nullable().openapi({
		description: "External identifier for the visitor.",
		example: "user_12345",
	}),
	name: z.string().nullable().openapi({
		description: "The visitor's name, if provided or identified.",
		example: "John Doe",
	}),
	email: z.string().email().nullable().openapi({
		description: "The visitor's email address, if provided or identified.",
		example: "john.doe@example.com",
	}),
});

export type PublicVisitor = z.infer<typeof publicVisitorResponseSchema>;
export type PublicVisitorResponse = PublicVisitor;
