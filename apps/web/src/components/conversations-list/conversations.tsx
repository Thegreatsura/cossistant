"use client";

import { usePathname } from "next/navigation";
import { ConversationItem } from "@/components/conversations-list/conversation-item";
import { useLocalConversations } from "@/sync/hooks/useLocalData";

type ConversationsListProps = {
  websiteId: string;
  websiteSlug: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function Conversations({ websiteSlug }: ConversationsListProps) {
  const pathname = usePathname();

  const { data: conversations } = useLocalConversations({
    websiteSlug,
  });

  return (
    <div className="flex flex-col gap-1">
      {conversations.map((c) => {
        const href = `/${websiteSlug}/${c.id}`;
        const active = pathname === href;
        return (
          <ConversationItem
            active={active}
            href={href}
            key={c.id}
            name={c.title ?? `Conversation ${c.id}`}
            online={false}
            time={c.updatedAt}
            unread={false}
          />
        );
      })}

      {conversations.length === 0 && (
        <div className="mx-1 mt-4 flex flex-col gap-1 rounded border border-primary/10 border-dashed p-2 text-center">
          <p className="text-primary/40 text-xs">No conversations yet</p>
        </div>
      )}
    </div>
  );
}
