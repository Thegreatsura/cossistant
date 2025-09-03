"use client";

import { usePathname } from "next/navigation";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { Logo } from "../../logo";
import { TopbarItem } from "./topbar-item";
import UserDropdown from "./user-dropdown";

export function NavigationTopbar() {
  const pathname = usePathname();
  const website = useWebsite();

  return (
    <header className="flex h-18 w-full items-center justify-between gap-4 pr-3 pl-8">
      <Logo className="text-primary" />
      <div className="flex flex-1 items-center gap-4">
        <TopbarItem
          active={pathname === `/${website.slug}`}
          href={`/${website.slug}`}
          iconName="dashboard"
        >
          Dashboard
        </TopbarItem>
        <TopbarItem
          active={pathname === `/${website.slug}/agents`}
          href={`/${website.slug}/agents`}
          iconName="agent"
        >
          Agents
        </TopbarItem>
      </div>
      <UserDropdown />
    </header>
  );
}
