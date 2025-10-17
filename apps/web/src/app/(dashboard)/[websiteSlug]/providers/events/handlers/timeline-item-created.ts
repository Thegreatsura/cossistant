import { clearTypingFromTimelineItem } from "@cossistant/react/realtime/typing-store";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { ConversationHeader } from "@/data/conversation-header-cache";
import {
  type ConversationMessage,
  upsertConversationMessageInCache,
} from "@/data/conversation-message-cache";
import type { DashboardRealtimeContext } from "../types";
import { forEachConversationHeadersQuery } from "./utils/conversation-headers";

type TimelineItemCreatedEvent = RealtimeEvent<"timelineItemCreated">;

type ConversationMessagesQueryInput = {
  conversationId?: string;
  websiteSlug?: string;
};

type QueryKeyInput = {
  input?: ConversationMessagesQueryInput;
  type?: string;
};

function toConversationMessage(
  timelineItem: TimelineItemCreatedEvent["payload"]["item"]
): ConversationMessage {
  // Convert timeline item to message format for the cache
  return {
    id: timelineItem.id,
    conversationId: timelineItem.conversationId,
    bodyMd: timelineItem.text,
    type: "text" as const,
    visibility: timelineItem.visibility,
    userId: timelineItem.userId,
    aiAgentId: timelineItem.aiAgentId,
    visitorId: timelineItem.visitorId,
    organizationId: timelineItem.organizationId,
    websiteId: "",
    parentMessageId: null,
    modelUsed: null,
    createdAt: timelineItem.createdAt,
    updatedAt: timelineItem.createdAt,
    deletedAt: timelineItem.deletedAt ?? null,
  };
}

function toHeaderLastTimelineItem(
  timelineItem: TimelineItemCreatedEvent["payload"]["item"]
): NonNullable<ConversationHeader["lastTimelineItem"]> {
  return {
    id: timelineItem.id,
    conversationId: timelineItem.conversationId,
    text: timelineItem.text,
    type: timelineItem.type,
    parts: timelineItem.parts,
    visibility: timelineItem.visibility,
    userId: timelineItem.userId,
    aiAgentId: timelineItem.aiAgentId,
    visitorId: timelineItem.visitorId,
    organizationId: timelineItem.organizationId,
    createdAt: timelineItem.createdAt,
    deletedAt: timelineItem.deletedAt,
  };
}

function extractQueryInput(
  queryKey: readonly unknown[]
): ConversationMessagesQueryInput | null {
  if (queryKey.length < 2) {
    return null;
  }

  const maybeInput = queryKey[1];
  if (!maybeInput || typeof maybeInput !== "object") {
    return null;
  }

  const input = (maybeInput as QueryKeyInput).input;
  if (!input || typeof input !== "object") {
    return null;
  }

  return input;
}

function isInfiniteQueryKey(queryKey: readonly unknown[]): boolean {
  const marker = queryKey[2];
  return Boolean(
    marker &&
      typeof marker === "object" &&
      "type" in marker &&
      (marker as QueryKeyInput).type === "infinite"
  );
}

export const handleMessageCreated = ({
  event,
  context,
}: {
  event: TimelineItemCreatedEvent;
  context: DashboardRealtimeContext;
}) => {
  const { queryClient, website } = context;
  const { payload } = event;
  const { item } = payload;
  const conversationMessage = toConversationMessage(item);

  // Clear typing state when a timeline item is created
  clearTypingFromTimelineItem(event);

  const headerTimelineItem = toHeaderLastTimelineItem(payload.item);

  const queries = queryClient.getQueryCache().findAll({
    queryKey: [["conversation", "getConversationTimelineItems"]],
  });

  for (const query of queries) {
    const queryKey = query.queryKey as readonly unknown[];

    if (!isInfiniteQueryKey(queryKey)) {
      continue;
    }

    const input = extractQueryInput(queryKey);
    if (!input) {
      continue;
    }

    if (input.conversationId !== payload.conversationId) {
      continue;
    }

    if (input.websiteSlug !== website.slug) {
      continue;
    }

    upsertConversationMessageInCache(
      queryClient,
      queryKey,
      conversationMessage
    );
  }

  const existingHeader =
    context.queryNormalizer.getObjectById<ConversationHeader>(
      payload.conversationId
    );

  if (!existingHeader) {
    forEachConversationHeadersQuery(
      queryClient,
      context.website.slug,
      (queryKey) => {
        queryClient
          .invalidateQueries({
            queryKey,
            exact: true,
          })
          .catch((error) => {
            console.error(
              "Failed to invalidate conversation header queries:",
              error
            );
          });
      }
    );
    return;
  }

  context.queryNormalizer.setNormalizedData({
    ...existingHeader,
    lastTimelineItem: headerTimelineItem,
    lastMessageAt: headerTimelineItem.createdAt,
    updatedAt: headerTimelineItem.createdAt,
  });
};
