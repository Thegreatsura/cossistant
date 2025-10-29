import type { ConversationHeader } from "@cossistant/types";
import { ConversationItemView } from "@/components/conversations-list/conversation-item";
import { PageContent } from "@/components/ui/layout";
import { getVisitorNameWithFallback } from "@/lib/visitors";

type FakeConversationListItemProps = {
  conversation: ConversationHeader;
};

export function FakeConversationListItem({
  conversation,
}: FakeConversationListItemProps) {
  const visitorName = getVisitorNameWithFallback(conversation.visitor);
  const lastTimelineItem = conversation.lastTimelineItem;

  return (
    <ConversationItemView
      focused={false}
      hasUnreadMessage={false}
      isTyping={false}
      lastMessageCreatedAt={
        lastTimelineItem?.createdAt
          ? new Date(lastTimelineItem.createdAt)
          : null
      }
      lastMessageText={lastTimelineItem?.text ?? ""}
      visitorAvatarUrl={conversation.visitor?.contact?.image ?? null}
      visitorLastSeenAt={conversation.visitor?.lastSeenAt ?? null}
      visitorName={visitorName}
      waitingSinceLabel={null}
    />
  );
}

type FakeConversationListProps = {
  conversations: ConversationHeader[];
};

export function FakeConversationList({
  conversations,
}: FakeConversationListProps) {
  return (
    <PageContent className="h-full overflow-auto px-2 contain-strict">
      {conversations.map((conversation) => (
        <FakeConversationListItem
          conversation={conversation}
          key={conversation.id}
        />
      ))}
    </PageContent>
  );
}
