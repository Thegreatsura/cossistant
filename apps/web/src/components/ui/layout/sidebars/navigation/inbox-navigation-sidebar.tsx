"use client";

import { usePathname } from "next/navigation";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { SidebarItem } from "../sidebar-item";

export function InboxNavigationSidebar() {
  const website = useWebsite();
  const pathname = usePathname();

  return (
    <ResizableSidebar position="left">
      <SidebarContainer>
        <SidebarItem
          active={
            pathname.includes(`/${website.slug}`) && !pathname.endsWith("/")
          }
          href={`/${website.slug}`}
          iconName="inbox-zero"
        >
          Inbox
        </SidebarItem>
        <SidebarItem href={`/${website.slug}/resolved`}>Resolved</SidebarItem>
        <SidebarItem href={`/${website.slug}/spam`}>Spam</SidebarItem>
        <SidebarItem href={`/${website.slug}/trash`}>Trash</SidebarItem>
      </SidebarContainer>
    </ResizableSidebar>
  );
}
