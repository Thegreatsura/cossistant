import { z } from "@hono/zod-openapi";

export const uploadPathSchema = z.string().max(512).openapi({
	description:
		"Optional relative path used to group uploads inside the bucket. Nested paths are supported.",
	example: "assets/avatars",
});

export const uploadFileNameSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(/^[^\\/]+$/)
	.openapi({
		description:
			"Optional file name to use for the object. Invalid characters will be sanitized on the server side.",
		example: "profile-picture.png",
	});

export const uploadFileExtensionSchema = z
	.string()
	.min(1)
	.max(16)
	.regex(/^[a-zA-Z0-9]+$/)
	.openapi({
		description:
			"Optional file extension without the leading dot. Use this when providing a custom file name without an extension.",
		example: "png",
	});

export const generateUploadUrlRequestSchema = z
	.object({
		contentType: z.string().min(1).max(256).openapi({
			description: "MIME type of the file to upload.",
			example: "image/png",
		}),
		path: uploadPathSchema.optional(),
		fileName: uploadFileNameSchema.optional(),
		fileExtension: uploadFileExtensionSchema.optional(),
		expiresInSeconds: z
			.number()
			.int()
			.min(60)
			.max(3600)
			.openapi({
				description:
					"Number of seconds before the signed URL expires. Defaults to 900 seconds (15 minutes).",
				example: 900,
			})
			.optional(),
	})
	.openapi({
		description: "Request payload to create a signed S3 upload URL.",
	});

export type GenerateUploadUrlRequest = z.infer<
	typeof generateUploadUrlRequestSchema
>;

export const generateUploadUrlResponseSchema = z
	.object({
		uploadUrl: z.string().url().openapi({
			description:
				"Pre-signed URL that accepts a PUT request to upload the file to S3.",
			example:
				"https://example-bucket.s3.amazonaws.com/org-id/file.png?X-Amz-Signature=...",
		}),
		key: z.string().openapi({
			description:
				"Resolved object key that can be used to reference the uploaded asset.",
			example: "01JG000000000000000000000/assets/file.png",
		}),
		bucket: z.string().openapi({
			description: "Name of the S3 bucket that will receive the upload.",
			example: "cossistant-uploads",
		}),
		expiresAt: z.string().openapi({
			description: "ISO timestamp indicating when the signed URL will expire.",
			example: "2024-01-01T12:00:00.000Z",
		}),
		contentType: z.string().openapi({
			description: "MIME type that should be used when uploading the file.",
			example: "image/png",
		}),
	})
	.openapi({
		description: "Response payload containing the signed upload URL.",
	});

export type GenerateUploadUrlResponse = z.infer<
	typeof generateUploadUrlResponseSchema
>;
