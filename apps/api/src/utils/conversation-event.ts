import type { Database } from "@api/db";
import type {
  ConversationEvent,
  ConversationEventType,
} from "@cossistant/types";
import { createTimelineItem } from "./timeline-item";

type ConversationContext = {
  conversationId: string;
  organizationId: string;
  websiteId: string;
  visitorId?: string | null;
};

type CreateConversationEventPayload = {
  type: ConversationEventType;
  actorUserId?: string | null;
  actorAiAgentId?: string | null;
  targetUserId?: string | null;
  targetAiAgentId?: string | null;
  metadata?: Record<string, unknown> | null;
  message?: string | null;
  createdAt?: Date;
};

export type CreateConversationEventOptions = {
  db: Database;
  context: ConversationContext;
  event: CreateConversationEventPayload;
};

export async function createConversationEvent({
  db,
  context,
  event,
}: CreateConversationEventOptions): Promise<ConversationEvent> {
  const createdAt = event.createdAt ?? new Date();

  const createdTimelineItem = await createTimelineItem({
    db,
    organizationId: context.organizationId,
    websiteId: context.websiteId,
    conversationId: context.conversationId,
    conversationOwnerVisitorId: context.visitorId ?? null,
    item: {
      type: "event",
      text: event.message ?? null,
      parts: [
        {
          type: "event",
          eventType: event.type,
          actorUserId: event.actorUserId ?? null,
          actorAiAgentId: event.actorAiAgentId ?? null,
          targetUserId: event.targetUserId ?? null,
          targetAiAgentId: event.targetAiAgentId ?? null,
          message: event.message ?? null,
        },
      ],
      visibility: "public",
      userId: event.actorUserId ?? null,
      aiAgentId: event.actorAiAgentId ?? null,
      visitorId: null,
      createdAt,
    },
  });

  // Convert timeline item to conversation event format for backward compatibility
  const conversationEventResponse: ConversationEvent = {
    id: createdTimelineItem.id,
    organizationId: createdTimelineItem.organizationId,
    conversationId: createdTimelineItem.conversationId,
    type: event.type,
    actorUserId: event.actorUserId ?? null,
    actorAiAgentId: event.actorAiAgentId ?? null,
    targetUserId: event.targetUserId ?? null,
    targetAiAgentId: event.targetAiAgentId ?? null,
    metadata: event.metadata,
    message: event.message,
    createdAt: createdTimelineItem.createdAt,
    updatedAt: createdTimelineItem.createdAt,
    deletedAt: createdTimelineItem.deletedAt,
  };

  return conversationEventResponse;
}
