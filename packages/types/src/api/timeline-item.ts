import { z } from "@hono/zod-openapi";

import {
  ConversationEventType,
  ConversationTimelineType,
  MessageVisibility,
} from "../enums";

const timelinePartImageSchema = z.object({
  type: z.literal("image").openapi({
    description: "Type of timeline part - always 'image' for image parts",
  }),
  url: z.string().openapi({
    description: "URL of the image",
  }),
  mediaType: z.string().openapi({
    description: "MIME type of the image",
  }),
  fileName: z.string().optional().openapi({
    description: "Original filename of the image",
  }),
  size: z.number().optional().openapi({
    description: "Size of the image in bytes",
  }),
  width: z.number().optional().openapi({
    description: "Width of the image in pixels",
  }),
  height: z.number().optional().openapi({
    description: "Height of the image in pixels",
  }),
});

const timelinePartTextSchema = z.object({
  type: z.literal("text").openapi({
    description: "Type of timeline part - always 'text' for text parts",
  }),
  text: z.string().openapi({
    description: "The text content of this timeline part",
  }),
});

const timelineFileSchema = z.object({
  type: z.literal("file").openapi({
    description: "Type of timeline part - always 'file' for file parts",
  }),
  url: z.string().openapi({
    description: "URL of the file",
  }),
  mediaType: z.string().openapi({
    description: "MIME type of the file",
  }),
  fileName: z.string().optional().openapi({
    description: "Original filename of the file",
  }),
  size: z.number().optional().openapi({
    description: "Size of the file in bytes",
  }),
});

const timelinePartEventSchema = z.object({
  type: z.literal("event").openapi({
    description: "Type of timeline part - always 'event' for event parts",
  }),
  eventType: z
    .enum([
      ConversationEventType.ASSIGNED,
      ConversationEventType.UNASSIGNED,
      ConversationEventType.PARTICIPANT_REQUESTED,
      ConversationEventType.PARTICIPANT_JOINED,
      ConversationEventType.PARTICIPANT_LEFT,
      ConversationEventType.STATUS_CHANGED,
      ConversationEventType.PRIORITY_CHANGED,
      ConversationEventType.TAG_ADDED,
      ConversationEventType.TAG_REMOVED,
      ConversationEventType.RESOLVED,
      ConversationEventType.REOPENED,
    ])
    .openapi({
      description: "Type of event that occurred",
    }),
  actorUserId: z.string().nullable().openapi({
    description: "User that triggered the event, if applicable",
  }),
  actorAiAgentId: z.string().nullable().openapi({
    description: "AI agent that triggered the event, if applicable",
  }),
  targetUserId: z.string().nullable().openapi({
    description: "User targeted by the event, if applicable",
  }),
  targetAiAgentId: z.string().nullable().openapi({
    description: "AI agent targeted by the event, if applicable",
  }),
  message: z.string().nullable().optional().openapi({
    description: "Optional human readable message attached to the event",
  }),
});

const timelineItemPartsSchema = z
  .array(
    z.union([
      timelinePartTextSchema,
      timelinePartEventSchema,
      timelinePartImageSchema,
      timelineFileSchema,
    ])
  )
  .openapi({
    description:
      "Array of timeline parts that make up the timeline item content",
  });

export const createTimelineItemSchema = z.object({
  id: z.string().optional().openapi({
    description: "Unique identifier for the timeline item",
  }),
  conversationId: z.string().openapi({
    description: "ID of the conversation this timeline item belongs to",
  }),
  organizationId: z.string().openapi({
    description: "ID of the organization this timeline item belongs to",
  }),
  visibility: z
    .enum([MessageVisibility.PUBLIC, MessageVisibility.PRIVATE])
    .openapi({
      description: "Visibility level of the timeline item",
    }),
  type: z
    .enum([ConversationTimelineType.MESSAGE, ConversationTimelineType.EVENT])
    .openapi({
      description: "Type of timeline item - either a message or an event",
    }),
  text: z.string().openapi({
    description: "Main text content of the timeline item",
  }),
  parts: timelineItemPartsSchema,
  userId: z.string().nullable().openapi({
    description: "ID of the user who created this timeline item, if applicable",
  }),
  aiAgentId: z.string().nullable().openapi({
    description:
      "ID of the AI agent that created this timeline item, if applicable",
  }),
  visitorId: z.string().nullable().openapi({
    description:
      "ID of the visitor who created this timeline item, if applicable",
  }),
  createdAt: z.string().openapi({
    description: "ISO 8601 timestamp when the timeline item was created",
  }),
  deletedAt: z.string().nullable().optional().openapi({
    description:
      "ISO 8601 timestamp when the timeline item was deleted, if applicable",
  }),
});

export type CreateTimelineItemSchema = z.infer<typeof createTimelineItemSchema>;

export type TimelineItem = z.infer<typeof createTimelineItemSchema>;
export type TimelineItemParts = z.infer<typeof timelineItemPartsSchema>;

export type TimelinePartText = z.infer<typeof timelinePartTextSchema>;
export type TimelinePartImage = z.infer<typeof timelinePartImageSchema>;
export type TimelinePartFile = z.infer<typeof timelineFileSchema>;
export type TimelinePartEvent = z.infer<typeof timelinePartEventSchema>;
