import { z } from "@hono/zod-openapi";

/**
 * Visitor data update request schema
 */
export const userResponseSchema = z.object({
	id: z.ulid().openapi({
		description: "The user's unique identifier.",
		example: "01JG000000000000000000000",
	}),
	name: z
		.string()
		.openapi({
			description: "The user's name.",
			example: "John Doe",
		})
		.optional(),
	email: z.email().openapi({
		description: "The user's email address.",
		example: "john.doe@example.com",
	}),
	role: z.string().nullable().openapi({
		description: "The user's role.",
		example: "admin",
	}),
	image: z.url().nullable().openapi({
		description: "The user's image URL.",
		example: "https://example.com/image.png",
	}),
	createdAt: z.string().openapi({
		description: "The user's creation date.",
		example: "2021-01-01T00:00:00.000Z",
	}),
	updatedAt: z.string().openapi({
		description: "The user's last update date.",
		example: "2021-01-01T00:00:00.000Z",
	}),
	lastSeenAt: z.string().nullable().openapi({
		description: "The user's last seen date.",
		example: "2021-01-01T00:00:00.000Z",
	}),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
