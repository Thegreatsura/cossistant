"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";
import { ConversationItem } from "@/components/conversations-list/conversation-item";
import type { ConversationHeader } from "@/contexts/inboxes";

type ConversationsListProps = {
  basePath: string;
  conversations: ConversationHeader[];
};

const ITEM_HEIGHT = 44;

const VirtualConversationItem = memo(
  ({
    conversation,
    href,
  }: {
    conversation: ConversationHeader;
    href: string;
  }) => {
    return (
      <ConversationItem
        href={href}
        key={conversation.id}
        header={conversation}
      />
    );
  }
);

VirtualConversationItem.displayName = "VirtualConversationItem";

export function VirtualizedConversations({
  basePath,
  conversations,
}: ConversationsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render 5 items outside of the visible area for smoother scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      className="h-full overflow-auto"
      ref={parentRef}
      style={{
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          // biome-ignore lint/style/noNonNullAssertion: should never happen
          const conversation = conversations[virtualItem.index]!;
          const href = `${basePath}/${conversation.id}`;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <VirtualConversationItem
                conversation={conversation}
                href={href}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
