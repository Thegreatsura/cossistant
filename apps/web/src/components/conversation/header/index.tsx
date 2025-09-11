"use client";

import { useConversations } from "@/contexts/conversations";
import { PageHeader, PageHeaderTitle } from "../../ui/layout";
import { ConversationHeaderNavigation } from "./navigation";

export function ConversationHeader() {
  const { selectedConversationId } = useConversations();

  return (
    <PageHeader className="pl-3.5">
      <ConversationHeaderNavigation />
      <PageHeaderTitle>Conversation {selectedConversationId}</PageHeaderTitle>
    </PageHeader>
  );
}
