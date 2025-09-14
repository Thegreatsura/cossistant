import { WebsiteInstallationTarget, WebsiteStatus } from "@cossistant/types";
import {
	type InferInsertModel,
	type InferSelectModel,
	relations,
} from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../../utils/db";
import {
	ulidNullableReference,
	ulidPrimaryKey,
	ulidReference,
} from "../../utils/db/ids";
import { aiAgent } from "./ai-agent";
import { apiKey } from "./api-keys";
import { organization, team, user } from "./auth";
import { conversation } from "./conversation";

export const websiteInstallationTargetEnum = pgEnum(
	"website_installation_target",
	enumToPgEnum(WebsiteInstallationTarget),
);

export const websiteStatusEnum = pgEnum(
	"website_status",
	enumToPgEnum(WebsiteStatus),
);

export const website = pgTable(
	"website",
	{
		id: ulidPrimaryKey("id"),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		domain: text("domain").notNull(),
		isDomainOwnershipVerified: boolean("is_domain_ownership_verified")
			.default(false)
			.notNull(),
		description: text("description"),
		logoUrl: text("logo_url"),
		whitelistedDomains: text("whitelisted_domains").array().notNull(),
		installationTarget: websiteInstallationTargetEnum("installation_target")
			.$defaultFn(() => WebsiteInstallationTarget.NEXTJS)
			.notNull(),
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" },
		),
		teamId: ulidReference("team_id").references(() => team.id, {
			onDelete: "cascade",
		}),
		status: websiteStatusEnum("status").default(WebsiteStatus.ACTIVE).notNull(),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		// Index for filtering by organization and status
		index("website_org_status_idx").on(table.organizationId, table.status),
		// Index for filtering by team
		index("website_team_idx").on(table.teamId),
		// Index for soft delete queries
		index("website_deleted_at_idx").on(table.deletedAt),
		index("website_slug_idx").on(table.slug),
		index("website_domain_idx").on(table.domain),
		index("website_org_domain_idx").on(
			table.isDomainOwnershipVerified,
			table.domain,
		),
	],
);

export const visitor = pgTable(
	"visitor",
	{
		id: ulidPrimaryKey("id"),
		externalId: varchar("externalId", { length: 255 }).unique(),
		name: text("name"),
		email: text("email"),
		image: text("image"),
		metadata: jsonb("metadata"),
		// Browser and Device Information
		browser: varchar("browser", { length: 100 }),
		browserVersion: varchar("browser_version", { length: 50 }),
		os: varchar("os", { length: 100 }),
		osVersion: varchar("os_version", { length: 50 }),
		device: varchar("device", { length: 100 }),
		deviceType: varchar("device_type", { length: 50 }), // desktop, mobile, tablet
		// Location Information
		ip: varchar("ip", { length: 45 }), // Support both IPv4 and IPv6
		city: varchar("city", { length: 100 }),
		region: varchar("region", { length: 100 }),
		country: varchar("country", { length: 100 }),
		countryCode: varchar("country_code", { length: 2 }),
		latitude: real("latitude"),
		longitude: real("longitude"),
		// User Preferences
		language: varchar("language", { length: 10 }),
		timezone: varchar("timezone", { length: 100 }),
		// Screen Information
		screenResolution: varchar("screen_resolution", { length: 20 }),
		viewport: varchar("viewport", { length: 20 }),
		// Reference Fields
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" },
		),
		websiteId: ulidReference("website_id")
			.notNull()
			.references(() => website.id, { onDelete: "cascade" }),
		userId: ulidNullableReference("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		lastSeenAt: timestamp("last_seen_at"),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		// Index for tenant-scoped queries (most important)
		index("visitor_org_idx").on(table.organizationId),
		// Composite index for organization + website queries
		index("visitor_org_website_idx").on(table.organizationId, table.websiteId),
		// Composite index for visitor ID with organization (performance optimization)
		index("visitor_id_org_idx").on(table.id, table.organizationId),
		// Index for looking up visitors by website
		index("visitor_website_idx").on(table.websiteId),
		// Index for looking up visitors by user
		index("visitor_user_idx").on(table.userId),
		// Index for active visitors query within organization
		index("visitor_org_last_seen_idx").on(
			table.organizationId,
			table.lastSeenAt,
		),
		// Index for soft delete queries
		index("visitor_deleted_at_idx").on(table.deletedAt),
		// Unique index for identifier per website
		uniqueIndex("visitor_external_id_website_idx").on(
			table.externalId,
			table.websiteId,
		),
	],
);

export const view = pgTable(
	"view",
	{
		id: ulidPrimaryKey("id"),
		name: text("name").notNull(),
		description: text("description"),
		prompt: text("prompt"),
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" },
		),
		websiteId: ulidReference("website_id").references(() => website.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("view_org_idx").on(table.organizationId),
		index("view_website_idx").on(table.websiteId),
		uniqueIndex("view_website_name_idx").on(table.websiteId, table.name),
		index("view_deleted_at_idx").on(table.deletedAt),
	],
);

// Relations
export const websiteRelations = relations(website, ({ many, one }) => ({
	organization: one(organization, {
		fields: [website.organizationId],
		references: [organization.id],
	}),
	team: one(team, {
		fields: [website.teamId],
		references: [team.id],
	}),
	visitors: many(visitor),
	aiAgents: many(aiAgent),
	conversations: many(conversation),
	apiKeys: many(apiKey),
	views: many(view),
}));

export const visitorRelations = relations(visitor, ({ one, many }) => ({
	organization: one(organization, {
		fields: [visitor.organizationId],
		references: [organization.id],
	}),
	website: one(website, {
		fields: [visitor.websiteId],
		references: [website.id],
	}),
	user: one(user, {
		fields: [visitor.userId],
		references: [user.id],
	}),
	conversations: many(conversation),
}));

export const viewRelations = relations(view, ({ one }) => ({
	organization: one(organization, {
		fields: [view.organizationId],
		references: [organization.id],
	}),
	website: one(website, {
		fields: [view.websiteId],
		references: [website.id],
	}),
}));

export type WebsiteSelect = InferSelectModel<typeof website>;
export type WebsiteInsert = InferInsertModel<typeof website>;

export type VisitorSelect = InferSelectModel<typeof visitor>;
export type VisitorInsert = InferInsertModel<typeof visitor>;
export type ViewSelect = InferSelectModel<typeof view>;
export type ViewInsert = InferInsertModel<typeof view>;
