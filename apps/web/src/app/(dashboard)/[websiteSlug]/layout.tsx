import { redirect } from "next/navigation";
import { CentralContainer } from "@/components/ui/layout";
import { NavigationTopbar } from "@/components/ui/layout/navigation-topbar";
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

  prefetch(
    trpc.website.getBySlug.queryOptions({ slug: websiteSlug }),
    (error) => {
      console.error("Error prefetching website", error);
      if (error.data?.code === "UNAUTHORIZED") {
        redirect("/select");
      }
    }
  );

  return (
    <HydrateClient>
      <WebsiteProvider websiteSlug={websiteSlug}>
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-background-100 dark:bg-background-200">
          <NavigationTopbar />
          <CentralContainer>{children}</CentralContainer>
        </div>
      </WebsiteProvider>
    </HydrateClient>
  );
}
