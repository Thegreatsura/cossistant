import { ConversationsList } from "@/components/conversations-list";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { InboxNavigationSidebar } from "@/components/ui/layout/sidebars/navigation/inbox-navigation-sidebar";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

interface DashboardPageProps {
  params: Promise<{
    websiteSlug: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { websiteSlug } = await params;

  await ensureWebsiteAccess(websiteSlug);

  return (
    <>
      <InboxNavigationSidebar />
      <Page className="flex items-center justify-center px-3">
        <PageHeader>
          <PageHeaderTitle>Inbox</PageHeaderTitle>
        </PageHeader>
        <ConversationsList />
      </Page>
    </>
  );
}
