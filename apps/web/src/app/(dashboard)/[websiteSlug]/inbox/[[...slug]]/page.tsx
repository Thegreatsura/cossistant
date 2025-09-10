"use client";

import { Conversation } from "@/components/conversation";
import { ConversationsList } from "@/components/conversations-list";
import { useConversations } from "@/contexts/conversations";

interface DashboardPageProps {
  params: Promise<{
    websiteSlug: string;
    slug: string[];
  }>;
}

export default function ConversationRouterPage(_: DashboardPageProps) {
  const {
    selectedConversationId,
    conversations,
    selectedConversationStatus,
    basePath,
  } = useConversations();

  return selectedConversationId ? (
    <Conversation conversationId={selectedConversationId} />
  ) : (
    <ConversationsList
      basePath={basePath}
      conversations={conversations}
      selectedConversationStatus={selectedConversationStatus}
    />
  );
}
