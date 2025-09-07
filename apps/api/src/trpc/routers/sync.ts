import { getWebsiteByIdWithAccess } from "@api/db/queries/website";
import { conversation, message } from "@api/db/schema";
import {
	syncRequestSchema,
	syncConversationsResponseSchema,
	syncMessagesResponseSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";

export const syncRouter = createTRPCRouter({
  conversations: protectedProcedure
    .input(syncRequestSchema)
    .output(syncConversationsResponseSchema)
    .query(async ({ ctx: { db, user }, input }) => {
      const websiteData = await getWebsiteByIdWithAccess(db, {
        userId: user.id,
        websiteId: input.websiteId,
      });

      if (!websiteData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found or access denied",
        });
      }

      // Build where conditions for fetching conversations
      const whereConditions = [
        eq(conversation.organizationId, websiteData.organizationId),
        eq(conversation.websiteId, input.websiteId),
        isNull(conversation.deletedAt),
      ];

      // If cursor is provided, fetch only conversations updated after that timestamp
      if (input.cursor) {
        const cursorDate = new Date(input.cursor);
        whereConditions.push(gt(conversation.updatedAt, cursorDate));
      }

      // Fetch conversations with pagination
      const limit = input.limit ?? 50;
      const conversations = await db
        .select()
        .from(conversation)
        .where(and(...whereConditions))
        .orderBy(conversation.updatedAt)
        .limit(limit + 1);

      // Check if there's more data
      let hasMore = false;
      let nextCursor: string | null = null;

      if (conversations.length > limit) {
        hasMore = true;
        conversations.pop(); // Remove the extra item
        const lastConversation = conversations.at(-1);
        if (lastConversation) {
          nextCursor = lastConversation.updatedAt.toISOString();
        }
      }

      // Get last message timestamps for each conversation
      const conversationIds = conversations.map((c) => c.id);
      const lastMessageDates: Record<string, Date> = {};

      if (conversationIds.length > 0) {
        const messages = await db
          .select({
            conversationId: message.conversationId,
            createdAt: message.createdAt,
          })
          .from(message)
          .where(
            and(
              eq(message.organizationId, websiteData.organizationId),
              inArray(message.conversationId, conversationIds),
              isNull(message.deletedAt)
            )
          )
          .orderBy(desc(message.createdAt));

        // Group by conversation and take the latest message date
        for (const msg of messages) {
          if (!lastMessageDates[msg.conversationId]) {
            lastMessageDates[msg.conversationId] = msg.createdAt;
          }
        }
      }

      // Map conversations to sync format
      const syncConversations = conversations.map((conv) => ({
        ...conv,
        lastMessageAt: lastMessageDates[conv.id] || null,
      }));

      return {
        conversations: syncConversations,
        cursor: nextCursor,
        hasMore,
      };
    }),

  messages: protectedProcedure
    .input(syncRequestSchema)
    .output(syncMessagesResponseSchema)
    .query(async ({ ctx: { db, user }, input }) => {
      const websiteData = await getWebsiteByIdWithAccess(db, {
        userId: user.id,
        websiteId: input.websiteId,
      });

      if (!websiteData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Website not found or access denied",
        });
      }

      // First, get all conversation IDs for this website
      const websiteConversations = await db
        .select({ id: conversation.id })
        .from(conversation)
        .where(
          and(
            eq(conversation.organizationId, websiteData.organizationId),
            eq(conversation.websiteId, input.websiteId),
            isNull(conversation.deletedAt)
          )
        );

      const conversationIds = websiteConversations.map((c) => c.id);

      // If no conversations, return empty
      if (conversationIds.length === 0) {
        return {
          messages: [],
          cursor: null,
          hasMore: false,
        };
      }

      // Build where conditions for fetching messages
      const whereConditions = [
        eq(message.organizationId, websiteData.organizationId),
        inArray(message.conversationId, conversationIds),
        isNull(message.deletedAt),
      ];

      // If cursor is provided, fetch only messages updated after that timestamp
      if (input.cursor) {
        const cursorDate = new Date(input.cursor);
        whereConditions.push(gt(message.updatedAt, cursorDate));
      }

      // Fetch messages with pagination
      const limit = input.limit ?? 50;
      const messages = await db
        .select()
        .from(message)
        .where(and(...whereConditions))
        .orderBy(message.updatedAt)
        .limit(limit + 1);

      // Check if there's more data
      let hasMore = false;
      let nextCursor: string | null = null;

      if (messages.length > limit) {
        hasMore = true;
        messages.pop(); // Remove the extra item
        const lastMessage = messages.at(-1);
        if (lastMessage) {
          nextCursor = lastMessage.updatedAt.toISOString();
        }
      }

      return {
        messages,
        cursor: nextCursor,
        hasMore,
      };
    }),
});
