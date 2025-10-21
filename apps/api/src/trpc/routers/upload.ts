import { generateUploadUrl } from "@api/services/upload";
import {
	generateUploadUrlRequestSchema,
	generateUploadUrlResponseSchema,
} from "@cossistant/types/api/upload";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const requestSchema = generateUploadUrlRequestSchema.extend({
	organizationId: z.string().min(1).optional(),
	basePath: z.array(z.string().min(1)).optional(),
});

export const uploadRouter = createTRPCRouter({
	createSignedUrl: protectedProcedure
		.input(requestSchema)
		.output(generateUploadUrlResponseSchema)
		.mutation(async ({ ctx, input }) => {
			const sessionOrganizationId =
				(
					ctx.session as unknown as {
						activeOrganizationId?: string | null;
						organizationId?: string | null;
					}
				)?.activeOrganizationId ??
				(
					ctx.session as unknown as {
						organizationId?: string | null;
					}
				)?.organizationId ??
				null;

			const organizationId = input.organizationId ?? sessionOrganizationId;

			if (!organizationId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"An organization context is required to generate an upload URL.",
				});
			}

			const basePathSegments = [organizationId, ...(input.basePath ?? [])];

			const result = await generateUploadUrl({
				contentType: input.contentType,
				fileName: input.fileName,
				fileExtension: input.fileExtension,
				path: input.path,
				expiresInSeconds: input.expiresInSeconds,
				basePathSegments,
			});

			return result;
		}),
});
