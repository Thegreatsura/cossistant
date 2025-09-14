"use client";

import { useInboxes } from "@/contexts/inboxes";
import { PageHeader } from "../../ui/layout";
import { ConversationBasicActions } from "../actions/basic";
import { MoreConversationActions } from "../actions/more";
import { ConversationHeaderNavigation } from "./navigation";

export function ConversationHeader() {
  const { selectedConversationId } = useInboxes();

  if (!selectedConversationId) {
    return <></>;
  }

  return (
    <PageHeader className="pl-3.5">
      <ConversationHeaderNavigation />
      <div className="flex items-center gap-3">
        <ConversationBasicActions className="pr-0 gap-3" />
        <MoreConversationActions conversationId={selectedConversationId} />
      </div>
    </PageHeader>
  );
}
