"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useInboxes } from "@/contexts/inboxes";
import { useWebsite } from "@/contexts/website";
import { UserDropdown } from "../../../../user-dropdown";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { SidebarItem } from "../sidebar-item";

export function InboxNavigationSidebar() {
  const website = useWebsite();
  const pathname = usePathname();
  const { statusCounts } = useInboxes();

  const basePath = `/${website.slug}/inbox`;

  // Helper to determine if a specific inbox section is active
  const isInboxActive = (section?: "resolved" | "spam" | "archived") => {
    const isInInboxPath = pathname.startsWith(basePath);

    if (!isInInboxPath) {
      return false;
    }

    if (section !== undefined) {
      return pathname.includes(`/${section}`);
    }

    // Main inbox is active when we're in the inbox path
    // but NOT in resolved, spam, or archived sections
    const excludedSections = ["/resolved", "/spam", "/archived"];
    return !excludedSections.some((excluded) => pathname.includes(excluded));
  };

  return (
    <ResizableSidebar position="left">
      <SidebarContainer
        footer={
          <>
            <SidebarItem href={`/${website.slug}/settings`}>
              Settings
            </SidebarItem>
            <Separator className="opacity-30" />
            <UserDropdown websiteSlug={website.slug} />
          </>
        }
      >
        <SidebarItem
          active={isInboxActive()}
          href={`${basePath}`}
          // iconName="conversation"
          rightItem={
            <span className="pr-1 text-primary/40 text-xs">
              {statusCounts.open}
            </span>
          }
        >
          Inbox
        </SidebarItem>
        <SidebarItem
          active={isInboxActive("resolved")}
          href={`${basePath}/resolved`}
          // iconName="conversation-resolved"
        >
          Resolved
        </SidebarItem>
        <SidebarItem
          active={isInboxActive("spam")}
          href={`${basePath}/spam`}
          // iconName="conversation-spam"
        >
          Spam
        </SidebarItem>
        <SidebarItem
          active={isInboxActive("archived")}
          href={`${basePath}/archived`}
          // iconName="archive"
        >
          Archived
        </SidebarItem>
      </SidebarContainer>
    </ResizableSidebar>
  );
}
