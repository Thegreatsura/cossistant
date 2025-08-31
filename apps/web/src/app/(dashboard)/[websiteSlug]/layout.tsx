import { CentralBlock } from "@/components/ui/layout";
import { NavigationTopbar } from "@/components/ui/layout/navigation-topbar";
import { NavigationSidebar } from "@/components/ui/layout/sidebars/navigation/navigation-sidebar";
import { WebsiteProvider } from "@/contexts/dashboard/website-context";
import { HydrateClient, prefetch, trpc } from "@/lib/trpc/server";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    websiteSlug: string;
  }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { websiteSlug } = await params;

  prefetch(trpc.website.getBySlug.queryOptions({ slug: websiteSlug }));

  return (
    <HydrateClient>
      <WebsiteProvider websiteSlug={websiteSlug}>
        <div className="flex h-screen w-screen flex-col overflow-hidden">
          <NavigationTopbar />
          <CentralBlock>
            <NavigationSidebar />
            {children}
            {/* <ConversationSidebar /> */}
          </CentralBlock>
        </div>
      </WebsiteProvider>
    </HydrateClient>
  );
}
