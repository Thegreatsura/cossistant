"use client";

import type { ConversationStatus } from "@cossistant/types";
import type { InboxView } from "@cossistant/types/schemas";
import { useMemo } from "react";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { useConversationHeaders } from "@/data/use-conversation-headers";
import { Page, PageHeader, PageHeaderTitle } from "../ui/layout";
import { Conversations } from "./conversations";
import { useFilteredConversations } from "./use-filtered-conversations";

type Props = {
  basePath: string;
  selectedConversationStatus: ConversationStatus | "archived" | null;
  selectedView: InboxView | null;
  selectedConversationId: string | null;
};

export function ConversationsList({
  basePath,
  selectedConversationStatus,
  selectedView,
  selectedConversationId,
}: Props) {
  const { conversations } = useFilteredConversations({
    selectedConversationStatus,
    selectedView,
    selectedConversationId,
  });

  return (
    <Page className="px-3">
      <PageHeader>
        <PageHeaderTitle className="capitalize">
          {selectedConversationStatus || "Inbox"}
        </PageHeaderTitle>
      </PageHeader>
      <div className="h-full w-full py-2">
        {conversations.length === 0 ? (
          <div className="mx-1 mt-4 flex flex-col gap-1 rounded border border-primary/10 border-dashed p-2 text-center">
            <p className="text-primary/40 text-xs">No conversations yet</p>
          </div>
        ) : (
          <Conversations basePath={basePath} conversations={conversations} />
        )}
      </div>
    </Page>
  );
}
