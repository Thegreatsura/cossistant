"use client";

import { Page, PageHeader, PageHeaderTitle } from "../ui/layout";

type ConversationProps = {
  conversationId: string;
};

export function Conversation({ conversationId }: ConversationProps) {
  return (
    <Page className="py-2">
      <PageHeader>
        <PageHeaderTitle>Conversation {conversationId}</PageHeaderTitle>
      </PageHeader>
    </Page>
  );
}
