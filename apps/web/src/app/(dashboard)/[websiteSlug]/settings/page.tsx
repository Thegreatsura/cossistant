import { Page, PageHeader } from "@/components/ui/layout";
import { TextEffect } from "@/components/ui/text-effect";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

type DashboardPageProps = {
  params: Promise<{
    websiteSlug: string;
  }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { websiteSlug } = await params;
  await ensureWebsiteAccess(websiteSlug);

  return (
    <Page className="flex items-center justify-center">
      <PageHeader>
        <h4 className="px-2 text-primary/60 text-xs tracking-wider">
          Settings
        </h4>
      </PageHeader>
      <div className="flex flex-col gap-2 font-medium">
        <TextEffect className="font-normal text-3xl">Settings</TextEffect>
      </div>
    </Page>
  );
}
