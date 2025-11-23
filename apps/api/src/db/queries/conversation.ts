/** biome-ignore-all lint/style/noNonNullAssertion: ok here */
import { DEFAULT_PAGE_LIMIT } from "@api/constants";
import type { Database } from "@api/db";

import {
	contact,
	conversation,
	conversationSeen,
	conversationTimelineItem,
	conversationView,
	visitor,
} from "@api/db/schema";
import { generateShortPrimaryId } from "@api/utils/db/ids";

import {
	ConversationStatus,
	ConversationTimelineType,
	type TimelineItemVisibility as TimelineItemVisibilityEnum,
} from "@cossistant/types";
import {
	type TimelineItem,
	timelineItemPartsSchema,
} from "@cossistant/types/api/timeline-item";
import type { ConversationSeen } from "@cossistant/types/schemas";
import type { ConversationHeader } from "@cossistant/types/trpc/conversation";

import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNull,
	lt,
	or,
} from "drizzle-orm";

const TIMELINE_ITEM_TYPES: ConversationTimelineType[] = [
	ConversationTimelineType.MESSAGE,
	ConversationTimelineType.EVENT,
	ConversationTimelineType.IDENTIFICATION,
];

function isConversationTimelineType(
	value: unknown
): value is ConversationTimelineType {
	return TIMELINE_ITEM_TYPES.includes(value as ConversationTimelineType);
}

type ConversationTimelineItemRow = typeof conversationTimelineItem.$inferSelect;

function mapTimelineRowToTimelineItem(
	row: ConversationTimelineItemRow
): TimelineItem | null {
	if (!isConversationTimelineType(row.type)) {
		return null;
	}

	const parsedPartsResult = timelineItemPartsSchema.safeParse(row.parts ?? []);

	if (!parsedPartsResult.success) {
		return null;
	}

	return {
		id: row.id,
		conversationId: row.conversationId,
		organizationId: row.organizationId,
		visibility: row.visibility,
		type: row.type,
		text: row.text,
		parts: parsedPartsResult.data,
		userId: row.userId,
		visitorId: row.visitorId,
		aiAgentId: row.aiAgentId,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		tool: null,
	};
}

export async function upsertConversation(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		visitorId: string;
		conversationId?: string;
	}
) {
	const newConversationId = params.conversationId ?? generateShortPrimaryId();
	const now = new Date().toISOString();

	// Upsert conversation
	const [_conversation] = await db
		.insert(conversation)
		.values({
			id: newConversationId,
			organizationId: params.organizationId,
			websiteId: params.websiteId,
			visitorId: params.visitorId,
			status: ConversationStatus.OPEN,
			createdAt: now,
		})
		.onConflictDoNothing({
			target: conversation.id,
		})
		.returning();

	return _conversation;
}

export async function listConversations(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		visitorId: string;
		page?: number;
		limit?: number;
		status?: "open" | "closed";
		orderBy?: "createdAt" | "updatedAt";
		order?: "asc" | "desc";
	}
) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 3;
	const offset = (page - 1) * limit;
	const orderBy = params.orderBy ?? "updatedAt";
	const order = params.order ?? "desc";

	// Build where conditions
	const whereConditions = [
		eq(conversation.organizationId, params.organizationId),
		eq(conversation.websiteId, params.websiteId),
		eq(conversation.visitorId, params.visitorId),
	];

	if (params.status) {
		// Map API status to database status
		const statusMap: Record<string, ConversationStatus> = {
			open: ConversationStatus.OPEN,
			closed: ConversationStatus.RESOLVED,
		};

		const dbStatus = statusMap[params.status];
		if (dbStatus) {
			whereConditions.push(eq(conversation.status, dbStatus));
		}
	}

	// Get total count
	const totalCountResult = await db
		.select({ totalCount: count() })
		.from(conversation)
		.where(and(...whereConditions));

	// Get paginated conversations
	const orderColumn =
		orderBy === "createdAt" ? conversation.createdAt : conversation.updatedAt;
	const orderFn = order === "desc" ? desc : asc;

	const conversations = await db
		.select()
		.from(conversation)
		.where(and(...whereConditions))
		.orderBy(orderFn(orderColumn))
		.limit(limit)
		.offset(offset);

	// Get conversation IDs for fetching last timeline items
	const conversationIds = conversations.map((c) => c.id);

	// Fetch last timeline items for each conversation if there are any conversations
	const lastTimelineItemsMap: Record<
		string,
		typeof conversationTimelineItem.$inferSelect
	> = {};

	if (conversationIds.length > 0) {
		// Get all timeline items for the conversations and group by conversation ID
		const timelineItems = await db
			.select()
			.from(conversationTimelineItem)
			.where(
				and(
					eq(conversationTimelineItem.organizationId, params.organizationId),
					inArray(conversationTimelineItem.conversationId, conversationIds),
					isNull(conversationTimelineItem.deletedAt)
				)
			)
			.orderBy(desc(conversationTimelineItem.createdAt));

		// Group timeline items by conversation and take the first (latest) one for each
		for (const item of timelineItems) {
			if (!lastTimelineItemsMap[item.conversationId]) {
				lastTimelineItemsMap[item.conversationId] = item;
			}
		}
	}

	// Add lastTimelineItem to each conversation
	const conversationsWithLastTimelineItem = conversations.map((conv) => ({
		...conv,
		lastTimelineItem: lastTimelineItemsMap[conv.id] || undefined,
	}));

	const totalCount = Number(totalCountResult.at(0)?.totalCount ?? 0);
	const totalPages = Math.ceil(totalCount / limit);

	return {
		conversations: conversationsWithLastTimelineItem,
		pagination: {
			page,
			limit,
			total: totalCount,
			totalPages,
			hasMore: page < totalPages,
		},
	};
}

export async function getConversationByIdWithLastMessage(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		conversationId: string;
	}
) {
	const [_conversation] = await db
		.select()
		.from(conversation)
		.where(
			and(
				eq(conversation.id, params.conversationId),
				eq(conversation.organizationId, params.organizationId),
				eq(conversation.websiteId, params.websiteId)
			)
		);

	if (!_conversation) {
		return;
	}

	// Fetch the last timeline item for this conversation
	const [lastTimelineItem] = await db
		.select()
		.from(conversationTimelineItem)
		.where(
			and(
				eq(conversationTimelineItem.conversationId, params.conversationId),
				eq(conversationTimelineItem.organizationId, params.organizationId),
				isNull(conversationTimelineItem.deletedAt)
			)
		)
		.orderBy(desc(conversationTimelineItem.createdAt))
		.limit(1);

	return {
		..._conversation,
		lastTimelineItem: lastTimelineItem || undefined,
	};
}

export async function listConversationsHeaders(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		userId: string;
		limit?: number;
		cursor?: string | null;
		orderBy?: "createdAt" | "updatedAt";
	}
) {
	const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
	const orderBy = params.orderBy ?? "updatedAt";

	// Build where conditions
	const whereConditions = [
		eq(conversation.organizationId, params.organizationId),
		eq(conversation.websiteId, params.websiteId),
	];

	// Handle cursor-based pagination more efficiently
	if (params.cursor) {
		// Decode cursor to get the timestamp and ID (format: timestamp_id)
		const cursorParts = params.cursor.split("_");
		if (cursorParts.length === 2) {
			const cursorTimestamp = cursorParts[0];
			const cursorId = cursorParts[1];

			if (cursorTimestamp && cursorId) {
				const cursorDate = new Date(cursorTimestamp).toISOString();

				// Use composite cursor for stable pagination
				const cursorCondition = or(
					lt(conversation[orderBy], cursorDate),
					and(
						eq(conversation[orderBy], cursorDate),
						lt(conversation.id, cursorId)
					)
				);
				if (cursorCondition) {
					whereConditions.push(cursorCondition);
				}
			}
		} else {
			// Fallback to old cursor format (just ID)
			const [cursorConversation] = await db
				.select()
				.from(conversation)
				.where(eq(conversation.id, params.cursor))
				.limit(1);

			if (cursorConversation) {
				whereConditions.push(
					lt(conversation[orderBy], cursorConversation[orderBy])
				);
			}
		}
	}

	// Fetch base conversation rows plus visitor/contact metadata
	const results = await db
		.select({
			conversation,
			visitorId: visitor.id,
			visitorLastSeenAt: visitor.lastSeenAt,
			visitorBlockedAt: visitor.blockedAt,
			visitorBlockedByUserId: visitor.blockedByUserId,
			contactId: contact.id,
			contactName: contact.name,
			contactEmail: contact.email,
			contactImage: contact.image,
		})
		.from(conversation)
		.innerJoin(visitor, eq(conversation.visitorId, visitor.id))
		.leftJoin(contact, eq(visitor.contactId, contact.id))
		.where(and(...whereConditions))
		.orderBy(
			desc(conversation[orderBy]),
			desc(conversation.id) // Secondary sort for stable pagination
		)
		.limit(limit + 1);

	// Process results for pagination
	let nextCursor: string | null = null;
	let items = results;

	if (results.length > limit) {
		items = results.slice(0, limit);
		const lastItem = items.at(-1);
		if (lastItem) {
			// Create composite cursor with timestamp and ID
			const timestamp = lastItem.conversation[orderBy];
			nextCursor = `${timestamp}_${lastItem.conversation.id}`;
		}
	}

	const conversationIds = items.map((row) => row.conversation.id);

	const lastTimelineRows =
		conversationIds.length > 0
			? await db
					.select()
					.from(conversationTimelineItem)
					.where(
						and(
							eq(
								conversationTimelineItem.organizationId,
								params.organizationId
							),
							inArray(conversationTimelineItem.conversationId, conversationIds),
							isNull(conversationTimelineItem.deletedAt)
						)
					)
					.orderBy(
						desc(conversationTimelineItem.createdAt),
						desc(conversationTimelineItem.id)
					)
			: [];

	const lastMessageTimelineRows =
		conversationIds.length > 0
			? await db
					.select()
					.from(conversationTimelineItem)
					.where(
						and(
							eq(
								conversationTimelineItem.organizationId,
								params.organizationId
							),
							inArray(conversationTimelineItem.conversationId, conversationIds),
							eq(
								conversationTimelineItem.type,
								ConversationTimelineType.MESSAGE
							),
							isNull(conversationTimelineItem.deletedAt)
						)
					)
					.orderBy(
						desc(conversationTimelineItem.createdAt),
						desc(conversationTimelineItem.id)
					)
			: [];

	const viewRows =
		conversationIds.length > 0
			? await db
					.select({
						conversationId: conversationView.conversationId,
						viewId: conversationView.viewId,
					})
					.from(conversationView)
					.where(
						and(
							eq(conversationView.organizationId, params.organizationId),
							inArray(conversationView.conversationId, conversationIds),
							isNull(conversationView.deletedAt)
						)
					)
			: [];

	const seenRows =
		conversationIds.length > 0
			? await db
					.select({
						id: conversationSeen.id,
						conversationId: conversationSeen.conversationId,
						userId: conversationSeen.userId,
						visitorId: conversationSeen.visitorId,
						aiAgentId: conversationSeen.aiAgentId,
						lastSeenAt: conversationSeen.lastSeenAt,
						createdAt: conversationSeen.createdAt,
						updatedAt: conversationSeen.updatedAt,
					})
					.from(conversationSeen)
					.where(
						and(
							eq(conversationSeen.organizationId, params.organizationId),
							inArray(conversationSeen.conversationId, conversationIds)
						)
					)
					.orderBy(desc(conversationSeen.lastSeenAt))
			: [];

	const lastTimelineItemsMap = new Map<string, ConversationTimelineItemRow>();
	for (const item of lastTimelineRows) {
		if (lastTimelineItemsMap.has(item.conversationId)) {
			continue;
		}
		lastTimelineItemsMap.set(item.conversationId, item);
	}

	const lastMessageTimelineItemsMap = new Map<
		string,
		ConversationTimelineItemRow
	>();
	for (const item of lastMessageTimelineRows) {
		if (lastMessageTimelineItemsMap.has(item.conversationId)) {
			continue;
		}
		lastMessageTimelineItemsMap.set(item.conversationId, item);
	}

	const viewIdsMap = new Map<string, string[]>();
	for (const view of viewRows) {
		const list = viewIdsMap.get(view.conversationId) ?? [];
		list.push(view.viewId);
		viewIdsMap.set(view.conversationId, list);
	}

	const seenDataMap = new Map<string, ConversationSeen[]>();
	const userLastSeenMap = new Map<string, string | null>();

	for (const seen of seenRows) {
		const collection = seenDataMap.get(seen.conversationId) ?? [];
		collection.push({
			...seen,
			deletedAt: null,
		});
		seenDataMap.set(seen.conversationId, collection);

		if (seen.userId === params.userId) {
			const currentLastSeen = userLastSeenMap.get(seen.conversationId);
			const candidate = seen.lastSeenAt ?? null;
			if (!currentLastSeen) {
				userLastSeenMap.set(seen.conversationId, candidate);
			} else if (candidate) {
				const currentDate = new Date(currentLastSeen);
				const candidateDate = new Date(candidate);
				if (candidateDate > currentDate) {
					userLastSeenMap.set(seen.conversationId, candidate);
				}
			}
		}
	}

	const conversationsWithDetails = items.map((row) => {
		const conversationId = row.conversation.id;
		const timelineRow = lastTimelineItemsMap.get(conversationId) ?? null;
		const messageTimelineRow =
			lastMessageTimelineItemsMap.get(conversationId) ?? null;

		const lastTimelineItem = timelineRow
			? mapTimelineRowToTimelineItem(timelineRow)
			: null;
		const lastMessageTimelineItem = messageTimelineRow
			? mapTimelineRowToTimelineItem(messageTimelineRow)
			: null;

		const lastMessageAt =
			messageTimelineRow?.createdAt ??
			timelineRow?.createdAt ??
			row.conversation.lastMessageAt ??
			null;

		return {
			...row.conversation,
			visitor: {
				id: row.visitorId,
				lastSeenAt: row.visitorLastSeenAt ?? null,
				blockedAt: row.visitorBlockedAt ?? null,
				blockedByUserId: row.visitorBlockedByUserId,
				isBlocked: Boolean(row.visitorBlockedAt),
				contact: row.contactId
					? {
							id: row.contactId,
							name: row.contactName,
							email: row.contactEmail,
							image: row.contactImage,
						}
					: null,
			},
			viewIds: viewIdsMap.get(conversationId) ?? [],
			lastMessageAt,
			lastSeenAt: userLastSeenMap.get(conversationId) ?? null,
			lastMessageTimelineItem,
			lastTimelineItem,
			seenData: seenDataMap.get(conversationId) ?? [],
		};
	});

	return {
		items: conversationsWithDetails,
		nextCursor,
	};
}

export async function getConversationHeader(
	db: Database,
	params: {
		organizationId: string;
		websiteId: string;
		conversationId: string;
		userId?: string | null;
	}
): Promise<ConversationHeader | null> {
	const [row] = await db
		.select({
			conversation,
			visitorId: visitor.id,
			visitorLastSeenAt: visitor.lastSeenAt,
			visitorBlockedAt: visitor.blockedAt,
			visitorBlockedByUserId: visitor.blockedByUserId,
			contactId: contact.id,
			contactName: contact.name,
			contactEmail: contact.email,
			contactImage: contact.image,
		})
		.from(conversation)
		.innerJoin(visitor, eq(conversation.visitorId, visitor.id))
		.leftJoin(contact, eq(visitor.contactId, contact.id))
		.where(
			and(
				eq(conversation.organizationId, params.organizationId),
				eq(conversation.websiteId, params.websiteId),
				eq(conversation.id, params.conversationId)
			)
		)
		.limit(1);

	if (!row) {
		return null;
	}

	const [lastTimelineRow] = await db
		.select()
		.from(conversationTimelineItem)
		.where(
			and(
				eq(conversationTimelineItem.organizationId, params.organizationId),
				eq(conversationTimelineItem.conversationId, params.conversationId),
				isNull(conversationTimelineItem.deletedAt)
			)
		)
		.orderBy(
			desc(conversationTimelineItem.createdAt),
			desc(conversationTimelineItem.id)
		)
		.limit(1);

	const [lastMessageTimelineRow] = await db
		.select()
		.from(conversationTimelineItem)
		.where(
			and(
				eq(conversationTimelineItem.organizationId, params.organizationId),
				eq(conversationTimelineItem.conversationId, params.conversationId),
				eq(conversationTimelineItem.type, ConversationTimelineType.MESSAGE),
				isNull(conversationTimelineItem.deletedAt)
			)
		)
		.orderBy(
			desc(conversationTimelineItem.createdAt),
			desc(conversationTimelineItem.id)
		)
		.limit(1);

	const viewRows = await db
		.select({
			viewId: conversationView.viewId,
		})
		.from(conversationView)
		.where(
			and(
				eq(conversationView.organizationId, params.organizationId),
				eq(conversationView.conversationId, params.conversationId),
				isNull(conversationView.deletedAt)
			)
		);

	const seenRows = await db
		.select({
			id: conversationSeen.id,
			conversationId: conversationSeen.conversationId,
			userId: conversationSeen.userId,
			visitorId: conversationSeen.visitorId,
			aiAgentId: conversationSeen.aiAgentId,
			lastSeenAt: conversationSeen.lastSeenAt,
			createdAt: conversationSeen.createdAt,
			updatedAt: conversationSeen.updatedAt,
		})
		.from(conversationSeen)
		.where(
			and(
				eq(conversationSeen.organizationId, params.organizationId),
				eq(conversationSeen.conversationId, params.conversationId)
			)
		)
		.orderBy(desc(conversationSeen.lastSeenAt));

	const seenData: ConversationSeen[] = seenRows.map((seen) => ({
		...seen,
		deletedAt: null,
	}));

	const viewIds = viewRows.map((view) => view.viewId);

	const lastTimelineItem = lastTimelineRow
		? mapTimelineRowToTimelineItem(lastTimelineRow)
		: null;
	const lastMessageTimelineItem = lastMessageTimelineRow
		? mapTimelineRowToTimelineItem(lastMessageTimelineRow)
		: null;

	const lastMessageAt =
		lastMessageTimelineRow?.createdAt ??
		lastTimelineRow?.createdAt ??
		row.conversation.lastMessageAt ??
		null;

	const userLastSeenAt = params.userId
		? seenRows.reduce<string | null>((acc, seen) => {
				if (seen.userId !== params.userId || !seen.lastSeenAt) {
					return acc;
				}
				if (!acc) {
					return seen.lastSeenAt;
				}
				return new Date(seen.lastSeenAt) > new Date(acc)
					? seen.lastSeenAt
					: acc;
			}, null)
		: null;

	return {
		...row.conversation,
		visitor: {
			id: row.visitorId,
			lastSeenAt: row.visitorLastSeenAt ?? null,
			blockedAt: row.visitorBlockedAt ?? null,
			blockedByUserId: row.visitorBlockedByUserId,
			isBlocked: Boolean(row.visitorBlockedAt),
			contact: row.contactId
				? {
						id: row.contactId,
						name: row.contactName,
						email: row.contactEmail,
						image: row.contactImage,
					}
				: null,
		},
		viewIds,
		lastMessageAt,
		lastSeenAt: userLastSeenAt ?? null,
		lastMessageTimelineItem,
		lastTimelineItem,
		seenData,
	} satisfies ConversationHeader;
}

export async function getConversationById(
	db: Database,
	params: {
		conversationId: string;
	}
) {
	const [_conversation] = await db
		.select()
		.from(conversation)
		.where(eq(conversation.id, params.conversationId))
		.limit(1)
		.$withCache();

	return _conversation;
}

export async function getConversationSeenData(
	db: Database,
	params: {
		conversationId: string;
		organizationId: string;
	}
) {
	const seenRows = await db
		.select({
			id: conversationSeen.id,
			conversationId: conversationSeen.conversationId,
			userId: conversationSeen.userId,
			visitorId: conversationSeen.visitorId,
			aiAgentId: conversationSeen.aiAgentId,
			lastSeenAt: conversationSeen.lastSeenAt,
			createdAt: conversationSeen.createdAt,
			updatedAt: conversationSeen.updatedAt,
		})
		.from(conversationSeen)
		.where(
			and(
				eq(conversationSeen.organizationId, params.organizationId),
				eq(conversationSeen.conversationId, params.conversationId)
			)
		)
		.orderBy(desc(conversationSeen.lastSeenAt));

	return seenRows.map((seen) => ({
		...seen,
		deletedAt: null,
	}));
}

export async function getConversationTimelineItems(
	db: Database,
	params: {
		organizationId: string;
		conversationId: string;
		websiteId: string;
		limit?: number;
		cursor?: string | Date | null;
		visibility?: TimelineItemVisibilityEnum[];
	}
) {
	const limit = params.limit ?? DEFAULT_PAGE_LIMIT;

	// Build where clause scoped to the conversation
	const whereConditions = [
		eq(conversationTimelineItem.organizationId, params.organizationId),
		eq(conversationTimelineItem.conversationId, params.conversationId),
		isNull(conversationTimelineItem.deletedAt),
	];

	const visibilities = params.visibility;
	if (visibilities?.length) {
		if (visibilities.length === 1) {
			whereConditions.push(
				eq(conversationTimelineItem.visibility, visibilities[0]!)
			);
		} else {
			whereConditions.push(
				inArray(conversationTimelineItem.visibility, visibilities)
			);
		}
	}

	// When paginating fetch timeline items older than the current batch.
	if (params.cursor) {
		const cursorValue = params.cursor;
		const cursorParts =
			typeof cursorValue === "string" ? cursorValue.split("_") : [];

		if (cursorParts.length === 2) {
			const cursorTimestamp = cursorParts[0];
			const cursorId = cursorParts[1];
			if (cursorTimestamp && cursorId) {
				const cursorDate = new Date(cursorTimestamp);

				if (!Number.isNaN(cursorDate.getTime())) {
					const cursorIso = cursorDate.toISOString();
					whereConditions.push(
						or(
							lt(conversationTimelineItem.createdAt, cursorIso),
							and(
								eq(conversationTimelineItem.createdAt, cursorIso),
								lt(conversationTimelineItem.id, cursorId)
							)
						)!
					);
				}
			}
		} else {
			const cursorDate =
				cursorValue instanceof Date
					? cursorValue
					: new Date(cursorValue as string);

			if (!Number.isNaN(cursorDate.getTime())) {
				whereConditions.push(
					lt(conversationTimelineItem.createdAt, cursorDate.toISOString())
				);
			}
		}
	}

	// Fetch newest timeline items first for efficient backwards pagination.
	const rows = await db
		.select()
		.from(conversationTimelineItem)
		.where(and(...whereConditions))
		.orderBy(
			desc(conversationTimelineItem.createdAt),
			desc(conversationTimelineItem.id)
		)
		.limit(limit + 1);

	const hasNextPage = rows.length > limit;
	const limitedRows = hasNextPage ? rows.slice(0, limit) : rows;
	const nextCursor = hasNextPage
		? (() => {
				const lastRow = limitedRows.at(-1);
				if (!lastRow) {
					return;
				}

				const timestamp = new Date(lastRow.createdAt).toISOString();
				return `${timestamp}_${lastRow.id}`;
			})()
		: undefined;

	const timelineItems = [...limitedRows]
		.reverse()
		.map(mapTimelineRowToTimelineItem)
		.filter((item): item is TimelineItem => item !== null);

	return {
		items: timelineItems,
		nextCursor,
		hasNextPage,
	};
}

/**
 * Get a specific message's metadata (id and createdAt)
 * Used for anchoring notification workflows to the triggering message
 */
export async function getMessageMetadata(
	db: Database,
	params: {
		messageId: string;
		organizationId: string;
	}
) {
	const [message] = await db
		.select({
			id: conversationTimelineItem.id,
			createdAt: conversationTimelineItem.createdAt,
			conversationId: conversationTimelineItem.conversationId,
		})
		.from(conversationTimelineItem)
		.where(
			and(
				eq(conversationTimelineItem.id, params.messageId),
				eq(conversationTimelineItem.organizationId, params.organizationId),
				eq(conversationTimelineItem.type, "message"),
				isNull(conversationTimelineItem.deletedAt)
			)
		)
		.limit(1);

	return message;
}
