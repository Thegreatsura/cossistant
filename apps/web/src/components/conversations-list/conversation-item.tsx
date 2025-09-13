"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ConversationHeader } from "@/contexts/inboxes";
import { usePrefetchConversationData } from "@/data/use-prefetch-conversation-data";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { generateVisitorName } from "@/lib/visitors";

interface ConversationItemProps {
  href: string;
  header: ConversationHeader;
  websiteSlug: string;
}

export function ConversationItem({
  href,
  header,
  websiteSlug,
}: ConversationItemProps) {
  const { visitor, lastMessagePreview } = header;
  const { prefetchConversation } = usePrefetchConversationData();

  const fullName =
    visitor.name || visitor.email || generateVisitorName(visitor.id);

  return (
    <Link
      className={cn(
        "group/conversation-item relative flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-0",
        "hover:bg-background-200 hover:text-primary dark:hover:bg-background-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      href={href}
      prefetch="auto"
      onMouseEnter={() => {
        prefetchConversation({
          websiteSlug,
          conversationId: header.id,
          visitorId: header.visitorId,
        });
      }}
    >
      <Avatar
        url={visitor.avatar}
        fallbackName={fullName}
        lastOnlineAt={visitor.lastSeenAt}
        className="size-7"
      />

      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="mb-0.5 flex items-baseline justify-between gap-2">
          <h4 className={cn("truncate md:w-[120px]")}>{fullName}</h4>
        </div>
        <p className={cn("truncate pr-6 text-muted-foreground")}>
          {lastMessagePreview?.bodyMd}
        </p>
      </div>
      {lastMessagePreview && (
        <span className="shrink-0 pr-2 text-primary/40 text-xs">
          {formatTimeAgo(lastMessagePreview.createdAt)}
        </span>
      )}
    </Link>
  );
}
