import { and, eq, gt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../schema";
import { conversation, message } from "../schema";

interface SyncQueryParams {
  websiteId: string;
  organizationId: string;
  cursor?: string | null;
  limit?: number;
  page?: number;
}

const buildSyncConditions = (
  table: typeof conversation | typeof message,
  params: SyncQueryParams
) => {
  const conditions = [
    eq(table.organizationId, params.organizationId),
    eq(table.websiteId, params.websiteId),
  ];

  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    conditions.push(gt(table.updatedAt, cursorDate));
  }

  return and(...conditions);
};

export async function fetchSyncData(
  db: NodePgDatabase<typeof schema>,
  params: SyncQueryParams
) {
  const limit = params.limit ?? 100;
  const page = params.page ?? 0;
  const offset = page * limit;

  // Fetch conversations and messages with the same cursor and pagination
  const conversationsPromise = db
    .select()
    .from(conversation)
    .where(buildSyncConditions(conversation, params))
    .orderBy(conversation.updatedAt)
    .limit(limit + 1)
    .offset(offset);

  const messagesPromise = db
    .select()
    .from(message)
    .where(buildSyncConditions(message, params))
    .orderBy(message.updatedAt)
    .limit(limit + 1)
    .offset(offset);

  // Execute queries in parallel
  const [conversations, messages] = await Promise.all([
    conversationsPromise,
    messagesPromise,
  ]);

  // Check if there's more data
  let hasMoreConversations = false;
  let hasMoreMessages = false;

  if (conversations.length > limit) {
    hasMoreConversations = true;
    conversations.pop();
  }

  if (messages.length > limit) {
    hasMoreMessages = true;
    messages.pop();
  }

  // If both have no more data, we've reached the end
  const hasMore = hasMoreConversations || hasMoreMessages;

  // If we've reached the end and have a cursor, update it to now
  const nextCursor =
    !hasMore && params.cursor
      ? new Date().toISOString()
      : params.cursor || null;

  // Transform conversations to include lastMessageAt field (set to null for now)
  const conversationsWithLastMessageAt = conversations.map((conv) => ({
    ...conv,
    lastMessageAt: null as Date | null,
  }));

  return {
    conversations: conversationsWithLastMessageAt,
    messages,
    cursor: nextCursor,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}
