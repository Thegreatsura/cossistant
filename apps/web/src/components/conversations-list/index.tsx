"use client";

import { useRef } from "react";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { Conversations } from "./conversations";

export function ConversationsList() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const website = useWebsite();

  return (
    <div className="h-full w-full py-2" ref={scrollRef}>
      <Conversations
        scrollContainerRef={scrollRef as React.RefObject<HTMLDivElement | null>}
        websiteSlug={website.slug}
      />
    </div>
  );
}
