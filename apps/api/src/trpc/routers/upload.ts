import { generateUploadUrl } from "@api/services/upload";
import {
	generateUploadUrlRequestSchema,
	generateUploadUrlResponseSchema,
} from "@cossistant/types/api/upload";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

export const uploadRouter = createTRPCRouter({
	createSignedUrl: protectedProcedure
		.input(generateUploadUrlRequestSchema)
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

			if (!sessionOrganizationId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"An organization context is required to generate an upload URL.",
				});
			}

			if (input.scope.organizationId !== sessionOrganizationId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Scope organization does not match the authenticated organization context.",
				});
			}

			const result = await generateUploadUrl({
				contentType: input.contentType,
				fileName: input.fileName,
				fileExtension: input.fileExtension,
				path: input.path,
				scope: input.scope,
				useCdn: input.useCdn,
				expiresInSeconds: input.expiresInSeconds,
			});

			return result;
		}),
});
