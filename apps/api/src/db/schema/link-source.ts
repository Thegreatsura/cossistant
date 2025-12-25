import {
	type InferInsertModel,
	type InferSelectModel,
	relations,
} from "drizzle-orm";
import {
	bigint,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import {
	ulidNullableReference,
	ulidPrimaryKey,
	ulidReference,
} from "../../utils/db/ids";
import { isoTimestamp as timestamp } from "../../utils/db/timestamp";
import { aiAgent } from "./ai-agent";
import { organization } from "./auth";
import { knowledge } from "./knowledge";
import { website } from "./website";

export const linkSourceStatusEnum = pgEnum("link_source_status", [
	"pending",
	"crawling",
	"completed",
	"failed",
]);

export const linkSource = pgTable(
	"link_source",
	{
		id: ulidPrimaryKey("id"),
		organizationId: ulidReference("organization_id").references(
			() => organization.id,
			{ onDelete: "cascade" }
		),
		websiteId: ulidReference("website_id").references(() => website.id, {
			onDelete: "cascade",
		}),
		aiAgentId: ulidNullableReference("ai_agent_id").references(
			() => aiAgent.id,
			{
				onDelete: "cascade",
			}
		),
		url: text("url").notNull(),
		status: linkSourceStatusEnum("status").default("pending").notNull(),
		firecrawlJobId: text("firecrawl_job_id"),
		crawledPagesCount: integer("crawled_pages_count").default(0).notNull(),
		totalSizeBytes: bigint("total_size_bytes", { mode: "number" })
			.default(0)
			.notNull(),
		lastCrawledAt: timestamp("last_crawled_at"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		// Index for listing link sources by website
		index("link_source_website_idx").on(table.websiteId),
		// Index for filtering by agent
		index("link_source_agent_idx").on(table.aiAgentId),
		// Index for soft delete queries
		index("link_source_deleted_at_idx").on(table.deletedAt),
		// Index for status-based queries (e.g., finding crawling jobs)
		index("link_source_status_idx").on(table.status),
		// Unique constraint: one URL per website/agent combination
		uniqueIndex("link_source_url_unique_idx").on(
			table.websiteId,
			table.aiAgentId,
			table.url
		),
	]
);

export const linkSourceRelations = relations(linkSource, ({ one, many }) => ({
	organization: one(organization, {
		fields: [linkSource.organizationId],
		references: [organization.id],
	}),
	website: one(website, {
		fields: [linkSource.websiteId],
		references: [website.id],
	}),
	agent: one(aiAgent, {
		fields: [linkSource.aiAgentId],
		references: [aiAgent.id],
	}),
	knowledgeEntries: many(knowledge),
}));

export type LinkSourceSelect = InferSelectModel<typeof linkSource>;
export type LinkSourceInsert = InferInsertModel<typeof linkSource>;
export type LinkSourceStatus = (typeof linkSourceStatusEnum.enumValues)[number];
