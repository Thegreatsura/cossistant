import type {
  ConversationEvent,
  Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { useMemo } from "react";

export type GroupedMessage = {
  type: "message_group";
  senderId: string;
  senderType: SenderType;
  messages: MessageType[];
  firstMessageId: string;
  lastMessageId: string;
  firstMessageTime: Date;
  lastMessageTime: Date;
};

export type ConversationEventItem = {
  type: "event";
  event: ConversationEvent;
  timestamp: Date;
};

export type ConversationItem = GroupedMessage | ConversationEventItem;

export type UseGroupedMessagesOptions = {
  messages: MessageType[];
  events?: ConversationEvent[];
  seenData?: ConversationSeen[];
  currentViewerId?: string; // The ID of the current viewer (visitor, user, or AI agent)
  viewerType?: SenderType; // Type of the current viewer
};

export type UseGroupedMessagesProps = UseGroupedMessagesOptions;

// Helper function to determine sender ID and type from a message
const getSenderIdAndType = (
  message: MessageType
): { senderId: string; senderType: SenderType } => {
  if (message.visitorId) {
    return { senderId: message.visitorId, senderType: SenderType.VISITOR };
  }
  if (message.aiAgentId) {
    return { senderId: message.aiAgentId, senderType: SenderType.AI };
  }
  if (message.userId) {
    return { senderId: message.userId, senderType: SenderType.TEAM_MEMBER };
  }

  // Fallback for default messages that might not have sender IDs yet
  // Use the message ID as a temporary sender ID to prevent errors
  return {
    senderId: message.id || "default-sender",
    senderType: SenderType.TEAM_MEMBER, // Default to team member for welcome messages
  };
};

// Helper function to build read receipt data
type ReadReceiptData = {
  seenByMap: Map<string, Set<string>>; // messageId -> Set of userIds who have seen it
  lastReadMessageMap: Map<string, string>; // userId -> last messageId they read
  unreadCountMap: Map<string, number>; // userId -> number of unread messages
};

const buildReadReceiptData = (
  seenData: ConversationSeen[],
  messages: MessageType[]
): ReadReceiptData => {
  const seenByMap = new Map<string, Set<string>>();
  const lastReadMessageMap = new Map<string, string>();
  const unreadCountMap = new Map<string, number>();

  // Initialize map for all messages
  for (const message of messages) {
    seenByMap.set(message.id, new Set());
  }

  // Sort messages by time to process in order
  const sortedMessages = [...messages].sort(
    (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
  );

  // Process seen data for each viewer
  for (const seen of seenData) {
    let seenTime = seen.updatedAt?.getTime() || 0;
    const viewerId = seen.userId || seen.visitorId || seen.aiAgentId;
    if (!viewerId) {
      continue;
    }

    // Safety check: Find the last message sent by this viewer
    // Their lastSeenAt should be at least as recent as their last message
    const lastMessageByViewer = sortedMessages
      .filter((msg) => {
        if (seen.userId) {
          return msg.userId === viewerId;
        }
        if (seen.visitorId) {
          return msg.visitorId === viewerId;
        }
        if (seen.aiAgentId) {
          return msg.aiAgentId === viewerId;
        }
        return false;
      })
      .at(-1);

    if (lastMessageByViewer) {
      const lastMessageTime = lastMessageByViewer.createdAt?.getTime() || 0;
      // If their last message is more recent than their lastSeenAt,
      // assume they've seen up to their last message
      if (lastMessageTime > seenTime) {
        seenTime = lastMessageTime;
      }
    }

    let lastReadMessage: MessageType | null = null;
    let unreadCount = 0;
    let hasPassedLastSeen = false;

    // Process messages in chronological order
    for (const message of sortedMessages) {
      const messageTime = message.createdAt?.getTime() || 0;

      if (messageTime <= seenTime && !hasPassedLastSeen) {
        // This message has been seen
        const seenBy = seenByMap.get(message.id);
        if (seenBy) {
          seenBy.add(viewerId);
        }
        lastReadMessage = message;
      } else {
        // This message is unread
        hasPassedLastSeen = true;
        unreadCount++;
      }
    }

    // Store the last read message for this viewer
    if (lastReadMessage) {
      lastReadMessageMap.set(viewerId, lastReadMessage.id);
    }

    // Store unread count
    unreadCountMap.set(viewerId, unreadCount);
  }

  return { seenByMap, lastReadMessageMap, unreadCountMap };
};

// Helper function to group messages by sender
const groupMessagesBySender = (messages: MessageType[]): GroupedMessage[] => {
  const groupedMessages: GroupedMessage[] = [];
  let currentGroup: GroupedMessage | null = null;

  for (const message of messages) {
    const { senderId, senderType } = getSenderIdAndType(message);

    if (currentGroup && currentGroup.senderId === senderId) {
      // Add to existing group
      currentGroup.messages.push(message);
      currentGroup.lastMessageId = message.id;
      currentGroup.lastMessageTime = message.createdAt || new Date();
    } else {
      // Finalize previous group if exists
      if (currentGroup) {
        groupedMessages.push(currentGroup);
      }

      // Start new group
      currentGroup = {
        type: "message_group",
        senderId,
        senderType,
        messages: [message],
        firstMessageId: message.id,
        lastMessageId: message.id,
        firstMessageTime: message.createdAt || new Date(),
        lastMessageTime: message.createdAt || new Date(),
      };
    }
  }

  if (currentGroup) {
    groupedMessages.push(currentGroup);
  }

  return groupedMessages;
};

// Helper function to get timestamp for sorting
const getItemTimestamp = (item: ConversationItem): number => {
  if (item.type === "event") {
    return item.timestamp.getTime();
  }
  return item.firstMessageTime.getTime();
};

/**
 * Batches sequential messages from the same sender into groups and enriches
 * them with read-receipt helpers so UIs can render conversation timelines with
 * minimal effort. Seen data is normalised into quick lookup maps for unread
 * indicators.
 */
export const useGroupedMessages = ({
  messages,
  events = [],
  seenData = [],
  currentViewerId,
  viewerType,
}: UseGroupedMessagesOptions) => {
  return useMemo(() => {
    // Group messages by sender
    const groupedMessages = groupMessagesBySender(messages);

    // Build comprehensive read receipt data
    const { seenByMap, lastReadMessageMap, unreadCountMap } =
      buildReadReceiptData(seenData, messages);

    // Convert events to have the discriminant type
    const eventsWithType: ConversationEventItem[] = events.map((event) => ({
      type: "event" as const,
      event,
      timestamp: event.createdAt || new Date(),
    }));

    // Combine all items
    const allItems: ConversationItem[] = [
      ...groupedMessages,
      ...eventsWithType,
    ];

    // Sort by timestamp
    allItems.sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));

    return {
      items: allItems,
      seenByMap,
      lastReadMessageMap,
      unreadCountMap,

      // Helper to check if a message has been seen by current viewer
      isMessageSeenByViewer: (messageId: string): boolean => {
        if (!currentViewerId) {
          return false;
        }
        const seenBy = seenByMap.get(messageId);
        return seenBy ? seenBy.has(currentViewerId) : false;
      },

      // Helper to get all viewers who have seen a message
      getMessageSeenBy: (messageId: string): string[] => {
        const seenBy = seenByMap.get(messageId);
        return seenBy ? Array.from(seenBy) : [];
      },

      // Get the last message ID that a user has read
      getLastReadMessageId: (userId: string): string | undefined => {
        return lastReadMessageMap.get(userId);
      },

      // Check if this is the last read message for a user
      isLastReadMessage: (messageId: string, userId: string): boolean => {
        return lastReadMessageMap.get(userId) === messageId;
      },

      // Get unread count for a user
      getUnreadCount: (userId: string): number => {
        return unreadCountMap.get(userId) || 0;
      },

      // Check if there are unread messages after a specific message
      hasUnreadAfter: (messageId: string, userId: string): boolean => {
        const lastRead = lastReadMessageMap.get(userId);
        if (!lastRead) {
          return true; // All messages are unread
        }

        // Find the indices
        const messageIndex = messages.findIndex((m) => m.id === messageId);
        const lastReadIndex = messages.findIndex((m) => m.id === lastRead);

        return messageIndex < lastReadIndex;
      },
    };
  }, [messages, events, seenData, currentViewerId]);
};
