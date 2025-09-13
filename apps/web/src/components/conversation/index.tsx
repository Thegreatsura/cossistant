"use client";

import { useRef } from "react";
import { Page } from "../ui/layout";
import { VisitorSidebar } from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader } from "./header";
import { MessagesList } from "./messages/list";

type ConversationProps = {
  conversationId: string;
};

export function Conversation({ conversationId }: ConversationProps) {
  return (
    <>
      <Page className="py-2">
        <ConversationHeader />
        <MessagesList
          messages={[]}
          events={[]}
          availableAIAgents={[]}
          availableHumanAgents={[]}
        />
      </Page>
      <VisitorSidebar />
    </>
  );
}
