import { redirect } from "next/navigation";
import { CentralContainer } from "@/components/ui/layout";
import { NavigationTopbar } from "@/components/ui/layout/navigation-topbar";
import { WebsiteProvider } from "@/contexts/dashboard/website-context";
import { HydrateClient, prefetch, trpc } from "@/lib/trpc/server";
import { DashboardProviders } from "./providers";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    websiteSlug: string;
  }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { websiteSlug } = await params;

  await Promise.all([
    prefetch(
      trpc.website.getBySlug.queryOptions({ slug: websiteSlug }),
      (error) => {
        console.error("Error prefetching website", error);
        // Handle any error type, not just UNAUTHORIZED
        if (
          error.data?.code === "UNAUTHORIZED" ||
          error.data?.code === "FORBIDDEN"
        ) {
          redirect("/select");
        }
        // For other errors, we still redirect to select
        // This ensures the user doesn't see a broken page
        redirect("/select");
      }
    ),
    prefetch(
      trpc.conversation.listConversationsHeaders.queryOptions({ websiteSlug })
    ),
  ]);

  return (
    <HydrateClient>
      <WebsiteProvider websiteSlug={websiteSlug}>
        <DashboardProviders>
          <div className="h-screen w-screen overflow-hidden bg-background-100 dark:bg-background-100">
            <NavigationTopbar />
            <CentralContainer>{children}</CentralContainer>
          </div>
        </DashboardProviders>
      </WebsiteProvider>
    </HydrateClient>
  );
}
