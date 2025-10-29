"use client";

import Link from "next/link";
import { TopbarItem } from "@/components/ui/layout/navigation-topbar/topbar-item";
import { Logo } from "@/components/ui/logo";

export function FakeNavigationTopbar() {
  return (
    <header className="pointer-events-none flex h-16 min-h-16 w-full items-center justify-between gap-4 pr-3 pl-6.5">
      <div className="flex flex-1 items-center gap-3">
        <Link className="mr-2" href="/">
          <Logo className="size-5.5 text-primary" />
        </Link>
        <TopbarItem active={true} href="/" iconName="inbox-zero">
          Inbox
        </TopbarItem>
        {process.env.NODE_ENV === "development" && (
          <TopbarItem hideLabelOnMobile href="/contacts" iconName="contacts">
            Contacts
          </TopbarItem>
        )}
        {/* {process.env.NODE_ENV === "development" && (
          <TopbarItem
            active={pathname === `/${website?.slug}/agents`}
            hideLabelOnMobile
            href={`/${website?.slug}/agents`}
            iconName="agent"
          >
            Agents
          </TopbarItem>
        )} */}
      </div>
      <div className="mr-2 flex items-center gap-3">
        <div className="hidden items-center gap-3 font-medium text-primary/80 text-xs md:flex">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 animate-pulse rounded-full bg-cossistant-green"
            />
            <p>10 visitors online</p>
          </span>
        </div>
      </div>
    </header>
  );
}
