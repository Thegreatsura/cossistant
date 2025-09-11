"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWebsite } from "@/contexts/website";
import UserDropdown from "../../../user-dropdown";
import { Logo } from "../../logo";
import { TopbarItem } from "./topbar-item";

export function NavigationTopbar() {
  const pathname = usePathname();
  const website = useWebsite();

  const baseInboxPath = `/${website?.slug}/inbox`;

  return (
    <header className="flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-3 pl-6">
      <div className="flex flex-1 items-center gap-4">
        <Link href={baseInboxPath}>
          <Logo className="size-6 text-primary" />
        </Link>
        <TopbarItem
          active={pathname.includes(baseInboxPath)}
          href={baseInboxPath}
          iconName="inbox-zero"
        >
          {website?.name}
        </TopbarItem>
        <TopbarItem
          active={pathname === `/${website?.slug}/agents`}
          hideLabelOnMobile
          href={`/${website?.slug}/agents`}
          iconName="agent"
        >
          Agents
        </TopbarItem>
      </div>
      <div className="flex items-center gap-3">
        <TopbarItem
          active={pathname === `/${website?.slug}/settings`}
          hideLabelOnMobile
          href={`/${website?.slug}/settings`}
          iconName="settings"
        >
          Settings
        </TopbarItem>
        <UserDropdown />
      </div>
    </header>
  );
}
