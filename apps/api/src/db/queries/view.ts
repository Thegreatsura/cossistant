import { and, eq, isNotNull, isNull } from "drizzle-orm/sql";
import type { Database } from "..";
import { view } from "../schema";

export async function listActiveWebsiteViews(
	db: Database,
	params: {
		websiteId: string;
	}
) {
	const views = await db
		.select()
		.from(view)
		.where(and(eq(view.websiteId, params.websiteId), isNull(view.deletedAt)));

	return views;
}

export async function listArchivedWebsiteViews(
	db: Database,
	params: {
		websiteId: string;
	}
) {
	const views = await db
		.select()
		.from(view)
		.where(
			and(eq(view.websiteId, params.websiteId), isNotNull(view.deletedAt))
		);

	return views;
}
