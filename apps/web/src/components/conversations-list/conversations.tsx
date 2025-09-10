"use client";

import type { RouterOutputs } from "@api/trpc/types";
import { ConversationItem } from "@/components/conversations-list/conversation-item";

type ConversationsListProps = {
  basePath: string;
  conversations: RouterOutputs["conversation"]["listConversationsHeaders"]["items"];
};

export function Conversations({
  basePath,
  conversations,
}: ConversationsListProps) {
  return (
    <div className="flex flex-col gap-1">
      {conversations.map((c) => {
        const href = `${basePath}/${c.id}`;

        return (
          <ConversationItem
            href={href}
            key={c.id}
            lastMessage={c.lastMessagePreview}
            name={c.title ?? `Conversation ${c.id}`}
            online={false}
            time={c.updatedAt}
            unread={false}
          />
        );
      })}
    </div>
  );
}
