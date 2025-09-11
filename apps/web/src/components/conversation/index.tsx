"use client";

import { Page, PageHeader, PageHeaderTitle } from "../ui/layout";
import { VisitorSidebar } from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader } from "./header";

type ConversationProps = {
  conversationId: string;
};

export function Conversation({ conversationId }: ConversationProps) {
  return (
    <>
      <Page className="py-2">
        <ConversationHeader />
      </Page>
      <VisitorSidebar />
    </>
  );
}
