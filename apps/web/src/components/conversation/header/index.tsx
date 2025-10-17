"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useInboxes } from "@/contexts/inboxes";
import { useUserSession } from "@/contexts/website";
import { useSidebar } from "@/hooks/use-sidebars";
import { PageHeader } from "../../ui/layout";
import { ConversationBasicActions } from "../actions/basic";
import { MoreConversationActions } from "../actions/more";
import { ConversationHeaderNavigation } from "./navigation";

export function ConversationHeader() {
  const { selectedConversationId, selectedVisitorId, selectedConversation } =
    useInboxes();
  const { user } = useUserSession();

  const { open: isRightSidebarOpen, toggle: toggleRightSidebar } = useSidebar({
    position: "right",
  });
  const { open: isLeftSidebarOpen, toggle: toggleLeftSidebar } = useSidebar({
    position: "left",
  });

  if (!selectedConversationId) {
    return null;
  }

  const lastMessagePreview = selectedConversation?.lastMessagePreview ?? null;
  const lastMessageCreatedAt = lastMessagePreview?.createdAt
    ? new Date(lastMessagePreview.createdAt)
    : null;
  const lastSeenAt = selectedConversation?.lastSeenAt
    ? new Date(selectedConversation.lastSeenAt)
    : null;

  const hasUnreadMessage = Boolean(
    lastMessagePreview &&
      lastMessagePreview.userId !== user.id &&
      lastMessageCreatedAt &&
      (!lastSeenAt || lastMessageCreatedAt > lastSeenAt),
  );

  return (
    <PageHeader className="z-10 border-primary/10 border-b bg-background pl-3.5 2xl:border-transparent 2xl:bg-transparent dark:bg-background-100 2xl:dark:bg-transparent">
      <div className="flex items-center gap-2">
        {!isLeftSidebarOpen && (
          <TooltipOnHover
            align="end"
            content="Click to open sidebar"
            shortcuts={["["]}
          >
            <Button
              className="ml-0.5"
              onClick={toggleLeftSidebar}
              size="icon-small"
              variant="ghost"
            >
              <Icon filledOnHover name="sidebar-collapse" />
            </Button>
          </TooltipOnHover>
        )}
        <ConversationHeaderNavigation />
      </div>
      <div className="flex items-center gap-3">
        <ConversationBasicActions
          className="gap-3 pr-0"
          conversationId={selectedConversationId}
          deletedAt={selectedConversation?.deletedAt ?? null}
          status={selectedConversation?.status}
          visitorId={selectedVisitorId}
        />
        <MoreConversationActions
          conversationId={selectedConversationId}
          deletedAt={selectedConversation?.deletedAt ?? null}
          hasUnreadMessage={hasUnreadMessage}
          status={selectedConversation?.status}
          visitorId={selectedVisitorId}
          visitorIsBlocked={selectedConversation?.visitor.isBlocked ?? null}
        />
        {!isRightSidebarOpen && (
          <TooltipOnHover
            align="end"
            content="Click to open sidebar"
            shortcuts={["]"]}
          >
            <Button
              className="rotate-180"
              onClick={toggleRightSidebar}
              size="icon-small"
              variant="ghost"
            >
              <Icon filledOnHover name="sidebar-collapse" />
            </Button>
          </TooltipOnHover>
        )}
      </div>
    </PageHeader>
  );
}
