"use client";

import { useWebsite } from "@/contexts/dashboard/website-context";
import { useSyncData } from "@/sync/hooks/useSyncData";

export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const website = useWebsite();

  useSyncData({
    websiteId: website.id,
    websiteSlug: website.slug,
  });

  return <>{children}</>;
}
