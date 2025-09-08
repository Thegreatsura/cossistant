import type { Database } from "@api/db";

import {
  conversation,
  type MessageSelect,
  message,
  visitor,
} from "@api/db/schema";
import { generateShortPrimaryId } from "@api/utils/db/ids";

import {
  ConversationStatus,
  MessageType,
  MessageVisibility,
} from "@cossistant/types";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
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
  const now = new Date();

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

  // Get conversation IDs for fetching last messages
  const conversationIds = conversations.map((c) => c.id);

  // Fetch last messages for each conversation if there are any conversations
  const lastMessagesMap: Record<string, MessageSelect> = {};

  if (conversationIds.length > 0) {
    // Get all messages for the conversations and group by conversation ID
    const messages = await db
      .select()
      .from(message)
      .where(
        and(
          eq(message.organizationId, params.organizationId),
          inArray(message.conversationId, conversationIds),
          eq(message.visibility, MessageVisibility.PUBLIC),
          eq(message.type, MessageType.TEXT),
          isNull(message.deletedAt)
        )
      )
      .orderBy(desc(message.createdAt));

    // Group messages by conversation and take the first (latest) one for each
    for (const msg of messages) {
      if (!lastMessagesMap[msg.conversationId]) {
        lastMessagesMap[msg.conversationId] = msg;
      }
    }
  }

  // Add lastMessage to each conversation
  const conversationsWithLastMessage = conversations.map((conv) => ({
    ...conv,
    lastMessage: lastMessagesMap[conv.id] || undefined,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    conversations: conversationsWithLastMessage,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export async function getConversationById(
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

  // Fetch the last message for this conversation
  const [lastMessage] = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.conversationId, params.conversationId),
        eq(message.organizationId, params.organizationId),
        eq(message.visibility, MessageVisibility.PUBLIC),
        eq(message.type, MessageType.TEXT),
        isNull(message.deletedAt)
      )
    )
    .orderBy(desc(message.createdAt))
    .limit(1);

  return {
    ..._conversation,
    lastMessage: lastMessage || undefined,
  };
}

async function fetchLastMessagesForConversations(
  db: Database,
  organizationId: string,
  conversationIds: string[]
): Promise<Record<string, MessageSelect>> {
  const lastMessagesMap: Record<string, MessageSelect> = {};

  if (conversationIds.length === 0) {
    return lastMessagesMap;
  }

  const messages = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.organizationId, organizationId),
        inArray(message.conversationId, conversationIds),
        eq(message.visibility, MessageVisibility.PUBLIC),
        eq(message.type, MessageType.TEXT),
        isNull(message.deletedAt)
      )
    )
    .orderBy(desc(message.createdAt));

  // Group messages by conversation and take the first (latest) one for each
  for (const msg of messages) {
    if (!lastMessagesMap[msg.conversationId]) {
      lastMessagesMap[msg.conversationId] = msg;
    }
  }

  return lastMessagesMap;
}

export async function listConversationsHeaders(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    limit?: number;
    // cursor is the updatedAt reference
    cursor?: string | null;
    orderBy?: "createdAt" | "updatedAt";
  }
) {
  const limit = params.limit ?? 50;
  const orderBy = params.orderBy ?? "updatedAt";

  const whereConditions = [
    eq(conversation.organizationId, params.organizationId),
    eq(conversation.websiteId, params.websiteId),
  ];

  // Handle cursor pagination - using ID-based cursor with timestamp ordering
  if (params.cursor) {
    const [cursorConversation] = await db
      .select()
      .from(conversation)
      .where(eq(conversation.id, params.cursor))
      .limit(1);

    if (cursorConversation) {
      // For cursor-based pagination with timestamp ordering, we need to ensure we get items
      // that come after the cursor item based on the orderBy field
      const orderColumn =
        orderBy === "createdAt"
          ? conversation.createdAt
          : conversation.updatedAt;
      whereConditions.push(lt(orderColumn, cursorConversation[orderBy]));
    }
  }

  // Get paginated conversations
  const res = await db
    .select()
    .from(conversation)
    .where(and(...whereConditions))
    .orderBy(desc(conversation[orderBy]))
    .innerJoin(visitor, eq(conversation.visitorId, visitor.id))
    .limit(limit + 1);

  // Check if there's a next page
  let nextCursor: string | null = null;

  if (res.length > limit) {
    const nextItem = res.pop();
    nextCursor = nextItem?.conversation.id ?? null;
  }

  // Fetch last messages
  const conversationIds = res.map((r) => r.conversation.id);

  const lastMessagesMap = await fetchLastMessagesForConversations(
    db,
    params.organizationId,
    conversationIds
  );

  // Add lastMessage details to each conversation
  const conversationsWithDetails = res.map((r) => {
    const lastMsg = lastMessagesMap[r.conversation.id];

    return {
      ...r.conversation,
      visitor: {
        id: r.visitor.id,
        externalId: r.visitor.externalId,
        name: r.visitor.name,
        email: r.visitor.email,
        avatar: r.visitor.image,
      },
      lastMessageAt: lastMsg?.createdAt ?? null,
      lastMessagePreview: lastMsg ? lastMsg : null,
    };
  });

  return {
    items: conversationsWithDetails,
    nextCursor,
  };
}
