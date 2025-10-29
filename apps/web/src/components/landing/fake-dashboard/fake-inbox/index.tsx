import type { ConversationHeader } from "@cossistant/types";
import {
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from "@/components/ui/layout";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";
import { FakeConversationList } from "./fake-conversation-list";

type TypingVisitor = {
  conversationId: string;
  visitorId: string;
};

type Props = {
  conversations: ConversationHeader[];
  typingVisitors?: TypingVisitor[];
};

export function FakeInbox({ conversations, typingVisitors = [] }: Props) {
  return (
    <>
      <FakeInboxNavigationSidebar
        activeView="inbox"
        open
        statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
      />
      <Page className="px-0">
        <PageHeader className="px-4">
          <div className="flex items-center gap-2">
            <PageHeaderTitle className="capitalize">Inbox</PageHeaderTitle>
          </div>
        </PageHeader>

        <FakeConversationList
          conversations={conversations}
          typingVisitors={typingVisitors}
        />
      </Page>
    </>
  );
}
