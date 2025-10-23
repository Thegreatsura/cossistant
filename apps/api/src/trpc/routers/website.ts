import {
  createApiKey,
  createDefaultWebsiteKeys,
  getApiKeyById,
  getApiKeysByOrganization,
  revokeApiKey,
} from "@api/db/queries/api-keys";
import { createDefaultWebsiteViews } from "@api/db/queries/view";
import {
  createWebsite,
  getWebsiteBySlugWithAccess,
  updateWebsite,
} from "@api/db/queries/website";
import { type WebsiteInsert, website } from "@api/db/schema";
import polarClient from "@api/lib/polar";
import { isOrganizationAdminOrOwner } from "@api/utils/access-control";
import { generateULID } from "@api/utils/db/ids";
import { normalizeDomain } from "@api/utils/domain";
import { domainToSlug } from "@api/utils/domain-slug";
import {
  APIKeyType,
  checkWebsiteDomainRequestSchema,
  createWebsiteApiKeyRequestSchema,
  createWebsiteRequestSchema,
  createWebsiteResponseSchema,
  revokeWebsiteApiKeyRequestSchema,
  updateWebsiteRequestSchema,
  websiteApiKeySchema,
  websiteDeveloperSettingsResponseSchema,
  websiteSummarySchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

type ApiKeyRecord = Awaited<
  ReturnType<typeof getApiKeysByOrganization>
>[number];

type ApiKeyLike =
  | ApiKeyRecord
  | Awaited<ReturnType<typeof createApiKey>>
  | Awaited<ReturnType<typeof revokeApiKey>>;

const toWebsiteApiKey = (
  key: ApiKeyLike,
  options?: { includeRawKey?: boolean }
) => ({
  id: key.id,
  name:
    key.name ??
    `${key.isTest ? "Test " : ""}${
      key.keyType === APIKeyType.PRIVATE ? "Private" : "Public"
    } API Key`,
  keyType: key.keyType,
  key:
    options?.includeRawKey || key.keyType !== APIKeyType.PRIVATE
      ? key.key
      : null,
  isTest: key.isTest,
  isActive: key.isActive,
  createdAt: key.createdAt,
  lastUsedAt: key.lastUsedAt ?? null,
  revokedAt: key.revokedAt ?? null,
});

export const websiteRouter = createTRPCRouter({
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx: { db, user }, input }) => {
      const websiteData = await getWebsiteBySlugWithAccess(db, {
        userId: user.id,
        websiteSlug: input.slug,
      });

      if (!websiteData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found or access denied",
        });
      }

      return websiteData;
    }),
  developerSettings: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .output(websiteDeveloperSettingsResponseSchema)
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.query.website.findFirst({
        where: and(eq(website.slug, input.slug), isNull(website.deletedAt)),
        columns: {
          id: true,
          slug: true,
          name: true,
          domain: true,
          contactEmail: true,
          logoUrl: true,
          organizationId: true,
          whitelistedDomains: true,
        },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      const hasAdminAccess = await isOrganizationAdminOrOwner(ctx.db, {
        organizationId: site.organizationId,
        userId: ctx.user.id,
      });

      if (!hasAdminAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to manage API keys for this website.",
        });
      }

      const apiKeys = await getApiKeysByOrganization(ctx.db, {
        orgId: site.organizationId,
        websiteId: site.id,
      });

      return {
        website: {
          id: site.id,
          slug: site.slug,
          name: site.name,
          domain: site.domain,
          contactEmail: site.contactEmail ?? null,
          logoUrl: site.logoUrl ?? null,
          organizationId: site.organizationId,
          whitelistedDomains: site.whitelistedDomains,
        },
        apiKeys: apiKeys
          .filter((key) => key.isActive)
          .map((key) => toWebsiteApiKey(key)),
      };
    }),
  create: protectedProcedure
    .input(createWebsiteRequestSchema)
    .output(createWebsiteResponseSchema)
    .mutation(async ({ ctx: { db, user }, input }) => {
      // Check if website with same verified domain already exists
      let normalizedDomain: string;

      try {
        normalizedDomain = normalizeDomain(input.domain);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain provided.",
          cause: error,
        });
      }

      const existingDomainWebsite = await db.query.website.findFirst({
        where: and(
          eq(website.domain, normalizedDomain),
          eq(website.isDomainOwnershipVerified, true)
        ),
      });

      if (existingDomainWebsite) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Domain already in use by another website",
        });
      }

      const userEmailDomain = user.email.split("@")[1]?.toLowerCase();
      const isDomainOwnershipVerified = userEmailDomain === normalizedDomain;

      // Generate a unique slug by always adding a random suffix
      const slug = domainToSlug(normalizedDomain);

      const createdWebsite = await createWebsite(db, {
        organizationId: input.organizationId,
        data: {
          name: input.name,
          installationTarget: input.installationTarget,
          domain: normalizedDomain,
          isDomainOwnershipVerified,
          whitelistedDomains: [
            `https://${normalizedDomain}`,
            "http://localhost:3000",
          ],
          slug,
        },
      });

      const [apiKeys] = await Promise.all([
        createDefaultWebsiteKeys(db, {
          websiteId: createdWebsite.id,
          websiteName: input.name,
          organizationId: input.organizationId,
          createdBy: user.id,
        }),
        createDefaultWebsiteViews(db, {
          websiteId: createdWebsite.id,
          websiteName: input.name,
          organizationId: input.organizationId,
          createdBy: user.id,
        }),
        polarClient.customers.create({
          email: user.email,
          name: user.name,
          // We link website to customer in Polar
          externalId: createdWebsite.id,
        }),
      ]);

      return {
        id: createdWebsite.id,
        name: createdWebsite.name,
        whitelistedDomains: createdWebsite.whitelistedDomains,
        organizationId: createdWebsite.organizationId,
        apiKeys: apiKeys.map((key) =>
          toWebsiteApiKey(key, { includeRawKey: true })
        ),
      };
    }),
  createApiKey: protectedProcedure
    .input(createWebsiteApiKeyRequestSchema)
    .output(websiteApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.query.website.findFirst({
        where: and(
          eq(website.id, input.websiteId),
          eq(website.organizationId, input.organizationId),
          isNull(website.deletedAt)
        ),
        columns: { id: true, organizationId: true },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      const hasAdminAccess = await isOrganizationAdminOrOwner(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.user.id,
      });

      if (!hasAdminAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to create API keys for this website.",
        });
      }

      const createdKey = await createApiKey(ctx.db, {
        id: generateULID(),
        name: input.name,
        organizationId: input.organizationId,
        websiteId: input.websiteId,
        keyType: input.keyType,
        createdBy: ctx.user.id,
        isTest: input.isTest,
      });

      return toWebsiteApiKey(createdKey, { includeRawKey: true });
    }),
  revokeApiKey: protectedProcedure
    .input(revokeWebsiteApiKeyRequestSchema)
    .output(websiteApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.query.website.findFirst({
        where: and(
          eq(website.id, input.websiteId),
          eq(website.organizationId, input.organizationId),
          isNull(website.deletedAt)
        ),
        columns: { id: true, organizationId: true },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      const hasAdminAccess = await isOrganizationAdminOrOwner(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.user.id,
      });

      if (!hasAdminAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to revoke API keys for this website.",
        });
      }

      const existingKey = await getApiKeyById(ctx.db, {
        orgId: input.organizationId,
        apiKeyId: input.apiKeyId,
      });

      if (!existingKey || existingKey.websiteId !== input.websiteId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const revoked = await revokeApiKey(ctx.db, {
        orgId: input.organizationId,
        apiKeyId: input.apiKeyId,
        revokedBy: ctx.user.id,
      });

      if (!revoked) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return toWebsiteApiKey(revoked);
    }),
  checkDomain: protectedProcedure
    .input(checkWebsiteDomainRequestSchema)
    .output(z.boolean())
    .query(async ({ ctx: { db }, input }) => {
      let normalizedDomain: string;

      try {
        normalizedDomain = normalizeDomain(input.domain);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain provided.",
          cause: error,
        });
      }

      const existingWebsite = await db.query.website.findFirst({
        where: and(
          eq(website.domain, normalizedDomain),
          eq(website.isDomainOwnershipVerified, true)
        ),
      });

      return !!existingWebsite;
    }),
  update: protectedProcedure
    .input(updateWebsiteRequestSchema)
    .output(websiteSummarySchema)
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.query.website.findFirst({
        where: and(
          eq(website.id, input.websiteId),
          eq(website.organizationId, input.organizationId),
          isNull(website.deletedAt)
        ),
        columns: {
          id: true,
          slug: true,
          name: true,
          domain: true,
          contactEmail: true,
          logoUrl: true,
          organizationId: true,
          whitelistedDomains: true,
        },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      const hasAdminAccess = await isOrganizationAdminOrOwner(ctx.db, {
        organizationId: input.organizationId,
        userId: ctx.user.id,
      });

      if (!hasAdminAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this website.",
        });
      }

      const updateData: Partial<Omit<WebsiteInsert, "organizationId">> = {
        ...input.data,
      };

      if (updateData.name) {
        const trimmedName = updateData.name.trim();

        if (!trimmedName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Website name cannot be empty.",
          });
        }

        updateData.name = trimmedName;
      }

      if (updateData.domain) {
        let normalizedDomain: string;

        try {
          normalizedDomain = normalizeDomain(updateData.domain);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid domain provided.",
            cause: error,
          });
        }

        if (normalizedDomain !== site.domain) {
          const existingDomain = await ctx.db.query.website.findFirst({
            where: and(
              eq(website.domain, normalizedDomain),
              eq(website.isDomainOwnershipVerified, true),
              ne(website.id, site.id)
            ),
          });

          if (existingDomain) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Domain already in use by another website",
            });
          }

          updateData.isDomainOwnershipVerified = false;
          updateData.whitelistedDomains = [`https://${normalizedDomain}`];
        }

        updateData.domain = normalizedDomain;
      }

      if (updateData.contactEmail !== undefined) {
        const trimmedEmail = updateData.contactEmail
          ? updateData.contactEmail.trim().toLowerCase()
          : null;

        updateData.contactEmail = trimmedEmail && trimmedEmail.length > 0
          ? trimmedEmail
          : null;
      }

      const updatedSite = await updateWebsite(ctx.db, {
        orgId: input.organizationId,
        websiteId: input.websiteId,
        data: updateData,
      });

      if (!updatedSite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found",
        });
      }

      return {
        id: updatedSite.id,
        slug: updatedSite.slug,
        name: updatedSite.name,
        domain: updatedSite.domain,
        contactEmail: updatedSite.contactEmail ?? null,
        logoUrl: updatedSite.logoUrl ?? null,
        organizationId: updatedSite.organizationId,
        whitelistedDomains: updatedSite.whitelistedDomains,
      };
    }),
});
