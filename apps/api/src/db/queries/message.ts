/** biome-ignore-all lint/style/noNonNullAssertion: ok here */
import { DEFAULT_PAGE_LIMIT } from "@api/constants";
import type { Database } from "@api/db";
import { message } from "@api/db/schema";
import { generateULID } from "@api/utils/db/ids";
import type { CreateMessageSchema } from "@cossistant/types";
import { and, desc, eq, lt, or } from "drizzle-orm";

export async function sendMessages(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		conversationId: string;
		messages: CreateMessageSchema[];
	}
) {
	const data = params.messages.map((m) => {
		const userId =
			m.userId && !m.userId.startsWith("default-") ? m.userId : null;
		const aiAgentId =
			m.aiAgentId && !m.aiAgentId.startsWith("default-") ? m.aiAgentId : null;
		const visitorId =
			m.visitorId && !m.visitorId.startsWith("default-") ? m.visitorId : null;

		const messageData = {
			id: m.id ?? generateULID(),
			bodyMd: m.bodyMd || "",
			type: m.type,
			userId,
			websiteId: params.websiteId,
			visitorId,
			organizationId: params.organizationId,
			conversationId: params.conversationId,
			aiAgentId,
			createdAt: m.createdAt,
			visibility: m.visibility,
		};

		return messageData;
	});

	const insertedMessages = await db.insert(message).values(data).returning();

	// TODO: Broadcast messages events to all connected clients

	return insertedMessages;
}

export async function getMessages(
	db: Database,
	params: {
		organizationId: string;
		conversationId: string;
		limit?: number;
		cursor?: string;
	}
) {
	const limit = params.limit ?? DEFAULT_PAGE_LIMIT;

	// Build where clause
	const whereConditions = [
		eq(message.organizationId, params.organizationId),
		eq(message.conversationId, params.conversationId),
	];

	// Add cursor condition if provided
	if (params.cursor) {
		whereConditions.push(lt(message.id, params.cursor));
	}

	// Fetch messages with pagination
	const messages = await db
		.select()
		.from(message)
		.where(and(...whereConditions))
		.orderBy(desc(message.createdAt))
		.limit(limit + 1); // Fetch one extra to determine if there's a next page

	// Determine if there's a next page
	const hasNextPage = messages.length > limit;
	const nextCursor = hasNextPage ? messages[limit - 1].id : undefined;

	// Remove the extra item if present
	if (hasNextPage) {
		messages.pop();
	}

	// Reverse to get chronological order (oldest first)
	messages.reverse();

	return {
		messages,
		nextCursor,
		hasNextPage,
	};
}

export async function getConversationMessages(
	db: Database,
	params: {
		conversationId: string;
		websiteId: string;
		limit?: number;
		cursor?: string | Date | null;
	}
) {
	const limit = params.limit ?? DEFAULT_PAGE_LIMIT;

	// Build where clause (scoped to website for safety)
	const whereConditions = [
		eq(message.conversationId, params.conversationId),
		eq(message.websiteId, params.websiteId),
	];

	// When paginating we want to fetch messages older than the current window,
	// hence the cursor acts as an upper bound (exclusive) on createdAt.
	if (params.cursor) {
		const cursorValue = params.cursor;
		const cursorParts =
			typeof cursorValue === "string" ? cursorValue.split("_") : [];

		if (cursorParts.length === 2) {
			const [cursorTimestamp, cursorId] = cursorParts;
			const cursorDate = new Date(cursorTimestamp);

			if (!Number.isNaN(cursorDate.getTime())) {
				const cursorIso = cursorDate.toISOString();
				whereConditions.push(
					or(
						lt(message.createdAt, cursorIso),
						and(eq(message.createdAt, cursorIso), lt(message.id, cursorId))
					)!
				);
			}
		} else {
			const cursorDate =
				cursorValue instanceof Date
					? cursorValue
					: new Date(cursorValue as string);

			if (!Number.isNaN(cursorDate.getTime())) {
				whereConditions.push(lt(message.createdAt, cursorDate.toISOString()));
			}
		}
	}

	// Fetch newest messages first so we can efficiently page backwards.
	const rows = await db
		.select()
		.from(message)
		.where(and(...whereConditions))
		.orderBy(desc(message.createdAt), desc(message.id))
		.limit(limit + 1);

	const hasNextPage = rows.length > limit;
	const limitedRows = hasNextPage ? rows.slice(0, limit) : rows;
	const nextCursor = hasNextPage
		? (() => {
				const lastRow = limitedRows.at(-1);
				if (!lastRow) {
					return null;
				}

				const timestamp = new Date(lastRow.createdAt).toISOString();
				return `${timestamp}_${lastRow.id}`;
			})()
		: null;

	// Return messages in chronological order for consumers.
	const messages = [...limitedRows].reverse();

	return {
		messages,
		nextCursor,
		hasNextPage,
	};
}
