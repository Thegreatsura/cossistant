import {
  Page,
  PageContent,
  PageHeader,
  PageHeaderTitle,
} from "@/components/ui/layout";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";

export function FakeInbox() {
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

        {/* <VirtualizedConversations
          basePath={basePath}
          conversations={conversations}
          showWaitingForReplyPill={showWaitingForReplyPill}
          websiteSlug={websiteSlug}
        /> */}
      </Page>
    </>
  );
}
