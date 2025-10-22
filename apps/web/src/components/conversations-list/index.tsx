"use client";

import type { ConversationStatus } from "@cossistant/types";
import type { ConversationHeader } from "@/contexts/inboxes";
import { Button } from "../ui/button";
import Icon from "../ui/icons";
import { Page, PageContent, PageHeader, PageHeaderTitle } from "../ui/layout";
import { TooltipOnHover } from "../ui/tooltip";
import { VirtualizedConversations } from "./virtualized-conversations";

type Props = {
  basePath: string;
  selectedConversationStatus: ConversationStatus | "archived" | null;
  conversations: ConversationHeader[];
  websiteSlug: string;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
};

export function ConversationsList({
  basePath,
  selectedConversationStatus,
  conversations,
  websiteSlug,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
}: Props) {
  return (
    <Page className="px-0">
      <PageHeader className="px-4">
        <div className="flex items-center gap-2">
          {!isLeftSidebarOpen && (
            <TooltipOnHover
              align="end"
              content="Click to open sidebar"
              shortcuts={["["]}
            >
              <Button
                className="ml-0.5"
                onClick={onToggleLeftSidebar}
                size="icon-small"
                variant="ghost"
              >
                <Icon filledOnHover name="sidebar-collapse" />
              </Button>
            </TooltipOnHover>
          )}
          <PageHeaderTitle className="capitalize">
            {selectedConversationStatus || "Inbox"}
          </PageHeaderTitle>
        </div>
      </PageHeader>
      {conversations.length === 0 ? (
        <PageContent>
          <div className="mx-1 mt-4 flex h-1/3 flex-col items-center justify-center gap-1">
            <p className="text-base text-primary/40">
              No {selectedConversationStatus} conversations yet
            </p>
          </div>
        </PageContent>
      ) : (
        <VirtualizedConversations
          basePath={basePath}
          conversations={conversations}
          websiteSlug={websiteSlug}
        />
      )}
    </Page>
  );
}
