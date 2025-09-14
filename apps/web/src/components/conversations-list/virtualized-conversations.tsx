"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";
import { ConversationItem } from "@/components/conversations-list/conversation-item";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useConversationKeyboardNavigation } from "./use-conversation-keyboard-navigation";

type ConversationsListProps = {
  basePath: string;
  conversations: ConversationHeader[];
  websiteSlug: string;
};

const ITEM_HEIGHT = 52;

const VirtualConversationItem = memo(
  ({
    conversation,
    href,
    websiteSlug,
    focused,
    onMouseEnter,
  }: {
    conversation: ConversationHeader;
    href: string;
    websiteSlug: string;
    focused: boolean;
    onMouseEnter: () => void;
  }) => {
    return (
      <ConversationItem
        href={href}
        key={conversation.id}
        header={conversation}
        websiteSlug={websiteSlug}
        focused={focused}
        setFocused={onMouseEnter}
      />
    );
  }
);

VirtualConversationItem.displayName = "VirtualConversationItem";

export function VirtualizedConversations({
  basePath,
  conversations,
  websiteSlug,
}: ConversationsListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { focusedIndex, handleMouseEnter } = useConversationKeyboardNavigation({
    conversations,
    basePath,
    parentRef,
    itemHeight: ITEM_HEIGHT,
    enabled: true,
  });

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    gap: 4,
    overscan: 4,
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
                websiteSlug={websiteSlug}
                focused={focusedIndex === virtualItem.index}
                onMouseEnter={() => handleMouseEnter(virtualItem.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
