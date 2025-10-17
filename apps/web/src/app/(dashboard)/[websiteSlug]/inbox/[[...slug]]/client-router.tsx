"use client";

import { Conversation } from "@/components/conversation";
import { ConversationsList } from "@/components/conversations-list";
import { useInboxes } from "@/contexts/inboxes";
import { useUserSession } from "@/contexts/website";

type InboxClientProps = {
  websiteSlug: string;
};

export default function InboxClientRouter({ websiteSlug }: InboxClientProps) {
  const { user } = useUserSession();

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
      currentUserId={user.id}
      visitorId={selectedVisitorId}
      websiteSlug={websiteSlug}
    />
  ) : (
    <ConversationsList
      basePath={basePath}
      conversations={conversations}
      selectedConversationStatus={selectedConversationStatus}
      websiteSlug={websiteSlug}
    />
  );
}
