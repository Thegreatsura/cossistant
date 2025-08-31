"use client";

import { useRef } from "react";
import { ConversationsList } from "@/components/ui/layout/sidebars/navigation/conversations";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function NavigationSidebar() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const website = useWebsite();

  return (
    <ResizableSidebar position="left">
      <SidebarContainer>
        <div className="flex h-full flex-col gap-1 overflow-hidden">
          <div
            className="scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-500 flex-1 overflow-y-auto px-2"
            ref={scrollRef}
          >
            <h4 className="px-2 text-primary/60 text-xs tracking-wider">
              Conversations
            </h4>
            <ConversationsList
              scrollContainerRef={
                scrollRef as React.RefObject<HTMLDivElement | null>
              }
              websiteId={website.id}
              websiteSlug={website.slug}
            />
          </div>
        </div>
      </SidebarContainer>
    </ResizableSidebar>
  );
}
