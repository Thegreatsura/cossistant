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

import { ConversationStatus } from "@cossistant/types";
import type { TimelineItemParts } from "@cossistant/types/api/timeline-item";
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
  sql,
} from "drizzle-orm";

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
  const [{ totalCount }] = await db
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

  // Create a subquery for the last timeline item per conversation using window function
  const lastTimelineItemSubquery = db
    .select({
      conversationId: conversationTimelineItem.conversationId,
      id: conversationTimelineItem.id,
      text: conversationTimelineItem.text,
      type: conversationTimelineItem.type,
      parts: conversationTimelineItem.parts,
      userId: conversationTimelineItem.userId,
      visitorId: conversationTimelineItem.visitorId,
      organizationId: conversationTimelineItem.organizationId,
      aiAgentId: conversationTimelineItem.aiAgentId,
      visibility: conversationTimelineItem.visibility,
      createdAt: conversationTimelineItem.createdAt,
      deletedAt: conversationTimelineItem.deletedAt,
      // Use ROW_NUMBER() to get only the latest timeline item per conversation
      rn: sql<number>`ROW_NUMBER() OVER (
				PARTITION BY ${conversationTimelineItem.conversationId}
				ORDER BY ${conversationTimelineItem.createdAt} DESC
			)`.as("rn"),
    })
    .from(conversationTimelineItem)
    .where(
      and(
        eq(conversationTimelineItem.organizationId, params.organizationId),
        isNull(conversationTimelineItem.deletedAt)
      )
    )
    .as("last_timeline_item");

  // Create a subquery for aggregated views per conversation
  const viewsSubquery = db
    .select({
      conversationId: conversationView.conversationId,
      viewIds: sql<string[]>`ARRAY_AGG(${conversationView.viewId})`.as(
        "view_ids"
      ),
    })
    .from(conversationView)
    .where(
      and(
        eq(conversationView.organizationId, params.organizationId),
        isNull(conversationView.deletedAt)
      )
    )
    .groupBy(conversationView.conversationId)
    .as("conv_views");

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
      const [cursorTimestamp, cursorId] = cursorParts;
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

  // Main query - single execution with all data
  const results = await db
    .select({
      // All conversation fields
      conversation,
      // Visitor fields (only what we need for the header)
      visitorId: visitor.id,
      visitorLastSeenAt: visitor.lastSeenAt,
      visitorBlockedAt: visitor.blockedAt,
      visitorBlockedByUserId: visitor.blockedByUserId,
      // Contact fields (if visitor is identified)
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      contactImage: contact.image,
      // Last timeline item fields (filtered by ROW_NUMBER = 1)
      lastTimelineItemId: lastTimelineItemSubquery.id,
      lastTimelineItemText: lastTimelineItemSubquery.text,
      lastTimelineItemType: lastTimelineItemSubquery.type,
      lastTimelineItemParts: lastTimelineItemSubquery.parts,
      lastTimelineItemUserId: lastTimelineItemSubquery.userId,
      lastTimelineItemVisitorId: lastTimelineItemSubquery.visitorId,
      lastTimelineItemOrganizationId: lastTimelineItemSubquery.organizationId,
      lastTimelineItemAiAgentId: lastTimelineItemSubquery.aiAgentId,
      lastTimelineItemVisibility: lastTimelineItemSubquery.visibility,
      lastTimelineItemCreatedAt: lastTimelineItemSubquery.createdAt,
      lastTimelineItemDeletedAt: lastTimelineItemSubquery.deletedAt,
      // Aggregated view IDs
      viewIds: viewsSubquery.viewIds,
      userLastSeenAt: conversationSeen.lastSeenAt,
    })
    .from(conversation)
    .innerJoin(visitor, eq(conversation.visitorId, visitor.id))
    .leftJoin(contact, eq(visitor.contactId, contact.id))
    .leftJoin(
      lastTimelineItemSubquery,
      and(
        eq(lastTimelineItemSubquery.conversationId, conversation.id),
        eq(lastTimelineItemSubquery.rn, 1) // Only get the first (latest) timeline item
      )
    )
    .leftJoin(
      conversationSeen,
      and(
        eq(conversationSeen.conversationId, conversation.id),
        eq(conversationSeen.userId, params.userId)
      )
    )
    .leftJoin(viewsSubquery, eq(viewsSubquery.conversationId, conversation.id))
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

  const seenDataMap = new Map<string, ConversationSeen[]>();

  if (conversationIds.length > 0) {
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
          inArray(conversationSeen.conversationId, conversationIds)
        )
      )
      .orderBy(desc(conversationSeen.lastSeenAt));

    for (const seen of seenRows) {
      const collection = seenDataMap.get(seen.conversationId) ?? [];
      collection.push({
        ...seen,
        lastSeenAt: seen.lastSeenAt,
        createdAt: seen.createdAt,
        updatedAt: seen.updatedAt,
        deletedAt: null,
      });
      seenDataMap.set(seen.conversationId, collection);
    }
  }

  // Transform results (much simpler now!)
  const conversationsWithDetails = items.map((row) => {
    // Build last timeline item object if it exists
    const lastTimelineItem =
      row.lastTimelineItemId &&
      row.lastTimelineItemText !== null &&
      row.lastTimelineItemType &&
      row.lastTimelineItemOrganizationId &&
      row.lastTimelineItemVisibility &&
      row.lastTimelineItemCreatedAt &&
      row.lastTimelineItemParts
        ? {
            id: row.lastTimelineItemId,
            conversationId: row.conversation.id,
            text: row.lastTimelineItemText,
            type: row.lastTimelineItemType,
            parts: row.lastTimelineItemParts as TimelineItemParts,
            visibility: row.lastTimelineItemVisibility,
            userId: row.lastTimelineItemUserId,
            visitorId: row.lastTimelineItemVisitorId,
            organizationId: row.lastTimelineItemOrganizationId,
            aiAgentId: row.lastTimelineItemAiAgentId,
            createdAt: row.lastTimelineItemCreatedAt,
            deletedAt: row.lastTimelineItemDeletedAt,
          }
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
      viewIds: row.viewIds || [],
      lastMessageAt: row.lastTimelineItemCreatedAt ?? null,
      lastSeenAt: row.userLastSeenAt ?? null,
      lastTimelineItem,
      seenData: seenDataMap.get(row.conversation.id) ?? [],
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
  const lastTimelineItemSubquery = db
    .select({
      conversationId: conversationTimelineItem.conversationId,
      id: conversationTimelineItem.id,
      text: conversationTimelineItem.text,
      type: conversationTimelineItem.type,
      parts: conversationTimelineItem.parts,
      userId: conversationTimelineItem.userId,
      visitorId: conversationTimelineItem.visitorId,
      organizationId: conversationTimelineItem.organizationId,
      aiAgentId: conversationTimelineItem.aiAgentId,
      visibility: conversationTimelineItem.visibility,
      createdAt: conversationTimelineItem.createdAt,
      deletedAt: conversationTimelineItem.deletedAt,
    })
    .from(conversationTimelineItem)
    .where(
      and(
        eq(conversationTimelineItem.organizationId, params.organizationId),
        eq(conversationTimelineItem.conversationId, params.conversationId),
        isNull(conversationTimelineItem.deletedAt)
      )
    )
    .orderBy(desc(conversationTimelineItem.createdAt))
    .limit(1)
    .as("last_timeline_item_single");

  const viewsSubquery = db
    .select({
      conversationId: conversationView.conversationId,
      viewIds: sql<string[]>`ARRAY_AGG(${conversationView.viewId})`.as(
        "view_ids"
      ),
    })
    .from(conversationView)
    .where(
      and(
        eq(conversationView.organizationId, params.organizationId),
        eq(conversationView.conversationId, params.conversationId),
        isNull(conversationView.deletedAt)
      )
    )
    .groupBy(conversationView.conversationId)
    .as("conv_views_single");

  const userJoinCondition = params.userId
    ? eq(conversationSeen.userId, params.userId)
    : sql`1=0`;

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
      lastTimelineItemId: lastTimelineItemSubquery.id,
      lastTimelineItemText: lastTimelineItemSubquery.text,
      lastTimelineItemType: lastTimelineItemSubquery.type,
      lastTimelineItemParts: lastTimelineItemSubquery.parts,
      lastTimelineItemUserId: lastTimelineItemSubquery.userId,
      lastTimelineItemVisitorId: lastTimelineItemSubquery.visitorId,
      lastTimelineItemOrganizationId: lastTimelineItemSubquery.organizationId,
      lastTimelineItemAiAgentId: lastTimelineItemSubquery.aiAgentId,
      lastTimelineItemVisibility: lastTimelineItemSubquery.visibility,
      lastTimelineItemCreatedAt: lastTimelineItemSubquery.createdAt,
      lastTimelineItemDeletedAt: lastTimelineItemSubquery.deletedAt,
      viewIds: viewsSubquery.viewIds,
      userLastSeenAt: params.userId
        ? conversationSeen.lastSeenAt
        : sql<string | null>`NULL`,
    })
    .from(conversation)
    .innerJoin(visitor, eq(conversation.visitorId, visitor.id))
    .leftJoin(contact, eq(visitor.contactId, contact.id))
    .leftJoin(
      lastTimelineItemSubquery,
      eq(lastTimelineItemSubquery.conversationId, conversation.id)
    )
    .leftJoin(viewsSubquery, eq(viewsSubquery.conversationId, conversation.id))
    .leftJoin(
      conversationSeen,
      and(
        eq(conversationSeen.conversationId, conversation.id),
        userJoinCondition
      )
    )
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

  const lastTimelineItem =
    row.lastTimelineItemId &&
    row.lastTimelineItemText !== null &&
    row.lastTimelineItemType &&
    row.lastTimelineItemOrganizationId &&
    row.lastTimelineItemVisibility &&
    row.lastTimelineItemCreatedAt &&
    row.lastTimelineItemParts
      ? {
          id: row.lastTimelineItemId,
          conversationId: row.conversation.id,
          text: row.lastTimelineItemText,
          type: row.lastTimelineItemType,
          parts: row.lastTimelineItemParts as TimelineItemParts,
          visibility: row.lastTimelineItemVisibility,
          userId: row.lastTimelineItemUserId,
          visitorId: row.lastTimelineItemVisitorId,
          organizationId: row.lastTimelineItemOrganizationId,
          aiAgentId: row.lastTimelineItemAiAgentId,
          createdAt: row.lastTimelineItemCreatedAt,
          deletedAt: row.lastTimelineItemDeletedAt,
        }
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
    viewIds: row.viewIds ?? [],
    lastMessageAt: row.conversation.lastMessageAt ?? null,
    lastSeenAt: row.userLastSeenAt ?? null,
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
    .$withCache({ tag: "conversation_by_id" });

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
    conversationId: string;
    websiteId: string;
    limit?: number;
    cursor?: string | Date | null;
  }
) {
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;

  // Build where clause scoped to the conversation
  const whereConditions = [
    eq(conversationTimelineItem.conversationId, params.conversationId),
  ];

  // When paginating fetch timeline items older than the current batch.
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
            lt(conversationTimelineItem.createdAt, cursorIso),
            and(
              eq(conversationTimelineItem.createdAt, cursorIso),
              lt(conversationTimelineItem.id, cursorId)
            )
          )!
        );
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

  return {
    items: [...limitedRows].reverse(),
    nextCursor,
    hasNextPage,
  };
}
