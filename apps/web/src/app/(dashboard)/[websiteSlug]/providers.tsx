"use client";

import { useWebsite } from "@/contexts/dashboard/website-context";

export function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const website = useWebsite();

  return <>{children}</>;
}
