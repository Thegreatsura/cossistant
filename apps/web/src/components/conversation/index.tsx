"use client";

import { useConversationEvents } from "@/data/use-conversation-events";
import { useConversationMessages } from "@/data/use-conversation-messages";
import { useVisitor } from "@/data/use-visitor";
import { Page } from "../ui/layout";
import { VisitorSidebar } from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader } from "./header";
import { MessagesList } from "./messages/list";

type ConversationProps = {
  conversationId: string;
  visitorId: string;
  websiteSlug: string;
};

export function Conversation({
  conversationId,
  visitorId,
  websiteSlug,
}: ConversationProps) {
  const { messages } = useConversationMessages({ conversationId, websiteSlug });
  const { events } = useConversationEvents({ conversationId, websiteSlug });
  const { visitor, isLoading } = useVisitor({ visitorId, websiteSlug });

  return (
    <>
      <Page className="py-0 px-[1px]">
        <ConversationHeader />
        <MessagesList
          messages={messages}
          events={events}
          availableAIAgents={[]}
          availableHumanAgents={[]}
        />
      </Page>
      <VisitorSidebar visitor={visitor} isLoading={isLoading} />
    </>
  );
}
