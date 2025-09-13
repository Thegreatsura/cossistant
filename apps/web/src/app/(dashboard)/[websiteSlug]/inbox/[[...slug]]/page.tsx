"use client";

import { use } from "react";
import { Conversation } from "@/components/conversation";
import { ConversationsList } from "@/components/conversations-list";
import { useInboxes } from "@/contexts/inboxes";

interface DashboardPageProps {
  params: Promise<{
    websiteSlug: string;
    slug: string[];
  }>;
}

export default function ConversationRouterPage({ params }: DashboardPageProps) {
  const { websiteSlug } = use(params);

  const {
    selectedConversationId,
    conversations,
    selectedConversationStatus,
    basePath,
    selectedVisitorId,
  } = useInboxes();

  return selectedConversationId && selectedVisitorId ? (
    <Conversation
      conversationId={selectedConversationId}
      visitorId={selectedVisitorId}
      websiteSlug={websiteSlug}
    />
  ) : (
    <ConversationsList
      basePath={basePath}
      conversations={conversations}
      selectedConversationStatus={selectedConversationStatus}
    />
  );
}
