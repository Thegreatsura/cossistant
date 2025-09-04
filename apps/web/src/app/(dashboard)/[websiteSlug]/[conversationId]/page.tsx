import { Page, PageHeader } from "@/components/ui/layout";
import { NavigationSidebar } from "@/components/ui/layout/sidebars/navigation/navigation-sidebar";
import { TextEffect } from "@/components/ui/text-effect";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

interface DashboardPageProps {
  params: Promise<{
    websiteSlug: string;
    conversationId: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { websiteSlug, conversationId } = await params;

  await ensureWebsiteAccess(websiteSlug);

  return (
    <>
      <NavigationSidebar />
      <Page className="flex items-center justify-center">
        <PageHeader>
          <h4 className="px-2 text-primary/60 text-xs tracking-wider">
            Conversation {conversationId}
          </h4>
        </PageHeader>
        <div className="flex flex-col gap-2 font-medium">
          <TextEffect className="font-normal text-3xl">
            Conversation {conversationId}
          </TextEffect>
        </div>
      </Page>
    </>
  );
}
