import type { Message as MessageType, SenderType } from "@cossistant/types";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

export interface MessageGroupRenderProps {
  // Sender information
  senderType: SenderType;
  senderId: string;

  // POV flags - who is viewing
  isSentByViewer: boolean; // True if the current viewer sent these messages
  isReceivedByViewer: boolean; // True if the current viewer received these messages

  // Sender type flags for convenience
  isVisitor: boolean;
  isAI: boolean;
  isTeamMember: boolean;

  // Message info
  messageCount: number;
  firstMessageId: string | undefined;
  lastMessageId: string | undefined;

  // Seen status
  hasBeenSeenByViewer?: boolean;
  seenByIds?: string[]; // IDs of users who have seen the last message in group
}

export interface MessageGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?:
    | React.ReactNode
    | ((props: MessageGroupRenderProps) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  messages: MessageType[];

  // POV context - who is viewing these messages
  viewerId?: string; // ID of the current viewer
  viewerType?: SenderType; // Type of the current viewer

  // Seen data
  seenByIds?: string[]; // IDs of users who have seen these messages
  lastReadMessageIds?: Map<string, string>; // Map of userId -> lastMessageId they read
}

export const MessageGroup = React.forwardRef<HTMLDivElement, MessageGroupProps>(
  (
    {
      children,
      className,
      asChild = false,
      messages = [],
      viewerId,
      viewerType,
      seenByIds = [],
      lastReadMessageIds,
      ...props
    },
    ref
  ) => {
    // Determine sender type from first message in group
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    // Determine sender info
    let senderId: string = "";
    let senderType: SenderType;

    if (firstMessage?.visitorId) {
      senderId = firstMessage.visitorId;
      senderType = "visitor" as SenderType;
    } else if (firstMessage?.aiAgentId) {
      senderId = firstMessage.aiAgentId;
      senderType = "ai" as SenderType;
    } else if (firstMessage?.userId) {
      senderId = firstMessage.userId;
      senderType = "team_member" as SenderType;
    } else {
      // Fallback
      senderId = firstMessage?.id || "unknown";
      senderType = "team_member" as SenderType;
    }

    // Determine POV
    const isSentByViewer = viewerId ? senderId === viewerId : false;
    const isReceivedByViewer = viewerId ? senderId !== viewerId : true;

    // Convenience flags
    const isVisitor = senderType === "visitor";
    const isAI = senderType === "ai";
    const isTeamMember = senderType === "team_member";

    // Check if viewer has seen these messages
    const hasBeenSeenByViewer = viewerId
      ? seenByIds.includes(viewerId)
      : undefined;

    const renderProps: MessageGroupRenderProps = {
      senderType,
      senderId,
      isSentByViewer,
      isReceivedByViewer,
      isVisitor,
      isAI,
      isTeamMember,
      messageCount: messages.length,
      firstMessageId: firstMessage?.id,
      lastMessageId: lastMessage?.id,
      hasBeenSeenByViewer,
      seenByIds,
    };

    const content =
      typeof children === "function" ? children(renderProps) : children;

    return useRenderElement(
      "div",
      {
        className,
        asChild,
      },
      {
        ref,
        state: renderProps,
        props: {
          role: "group",
          "aria-label": `Message group from ${senderType}`,
          ...props,
          children: content,
        },
      }
    );
  }
);

MessageGroup.displayName = "MessageGroup";

export interface MessageGroupAvatarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export const MessageGroupAvatar = React.forwardRef<
  HTMLDivElement,
  MessageGroupAvatarProps
>(({ children, className, asChild = false, ...props }, ref) => {
  return useRenderElement(
    "div",
    {
      className,
      asChild,
    },
    {
      ref,
      props: {
        ...props,
        children,
      },
    }
  );
});

MessageGroupAvatar.displayName = "MessageGroupAvatar";

export interface MessageGroupHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?:
    | React.ReactNode
    | ((props: {
        name?: string;
        senderId?: string;
        senderType?: SenderType;
      }) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  name?: string;
  senderId?: string;
  senderType?: SenderType;
}

export const MessageGroupHeader = React.forwardRef<
  HTMLDivElement,
  MessageGroupHeaderProps
>(
  (
    {
      children,
      className,
      asChild = false,
      name,
      senderId,
      senderType,
      ...props
    },
    ref
  ) => {
    const content =
      typeof children === "function"
        ? children({ name, senderId, senderType })
        : children;

    return useRenderElement(
      "div",
      {
        className,
        asChild,
      },
      {
        ref,
        props: {
          ...props,
          children: content,
        },
      }
    );
  }
);

MessageGroupHeader.displayName = "MessageGroupHeader";

export interface MessageGroupContentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export const MessageGroupContent = React.forwardRef<
  HTMLDivElement,
  MessageGroupContentProps
>(({ children, className, asChild = false, ...props }, ref) => {
  return useRenderElement(
    "div",
    {
      className,
      asChild,
    },
    {
      ref,
      props: {
        ...props,
        children,
      },
    }
  );
});

MessageGroupContent.displayName = "MessageGroupContent";

export interface MessageGroupSeenIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?:
    | React.ReactNode
    | ((props: {
        seenByIds: string[];
        hasBeenSeen: boolean;
      }) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  seenByIds?: string[];
}

export const MessageGroupSeenIndicator = React.forwardRef<
  HTMLDivElement,
  MessageGroupSeenIndicatorProps
>(({ children, className, asChild = false, seenByIds = [], ...props }, ref) => {
  const hasBeenSeen = seenByIds.length > 0;
  const content =
    typeof children === "function"
      ? children({ seenByIds, hasBeenSeen })
      : children;

  return useRenderElement(
    "div",
    {
      className,
      asChild,
    },
    {
      ref,
      props: {
        ...props,
        children: content,
      },
    }
  );
});

MessageGroupSeenIndicator.displayName = "MessageGroupSeenIndicator";

export interface MessageGroupReadIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  children?:
    | React.ReactNode
    | ((props: {
        readers: Array<{ userId: string; isLastRead: boolean }>;
        lastReaderIds: string[];
      }) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  messageId: string;
  lastReadMessageIds?: Map<string, string>;
}

export const MessageGroupReadIndicator = React.forwardRef<
  HTMLDivElement,
  MessageGroupReadIndicatorProps
>(
  (
    {
      children,
      className,
      asChild = false,
      messageId,
      lastReadMessageIds,
      ...props
    },
    ref
  ) => {
    // Find all users who stopped reading at this message
    const lastReaderIds: string[] = [];
    const readers: Array<{ userId: string; isLastRead: boolean }> = [];

    if (lastReadMessageIds) {
      lastReadMessageIds.forEach((lastMessageId, userId) => {
        if (lastMessageId === messageId) {
          lastReaderIds.push(userId);
          readers.push({ userId, isLastRead: true });
        }
      });
    }

    const content =
      typeof children === "function"
        ? children({ readers, lastReaderIds })
        : children;

    return useRenderElement(
      "div",
      {
        className,
        asChild,
      },
      {
        ref,
        props: {
          ...props,
          children: content,
        },
      }
    );
  }
);

MessageGroupReadIndicator.displayName = "MessageGroupReadIndicator";
