/** biome-ignore-all lint/style/noNonNullAssertion: ok here */
"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import type { ConversationStatus } from "@cossistant/types";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { useConversationHeaders } from "@/data/use-conversation-headers";
import { extractInboxParamsFromSlug } from "@/lib/url";
import { useWebsiteViews } from "./website-context";

export type ConversationHeader =
  RouterOutputs["conversation"]["listConversationsHeaders"]["items"][number];

interface ConversationsContextValue {
  openConversationCount: number;
  resolvedConversationCount: number;
  spamConversationCount: number;
  archivedConversationCount: number;
  conversations: ConversationHeader[];
  selectedConversationStatus: ConversationStatus | "archived" | null;
  selectedConversationId: string | null;
  basePath: string;
  selectedViewId: string | null;
  isLoading: boolean;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(
  null
);

interface ConversationsProviderProps {
  children: React.ReactNode;
  websiteSlug: string;
}

export function ConversationsProvider({
  children,
  websiteSlug,
}: ConversationsProviderProps) {
  const { conversations, isLoading } = useConversationHeaders(websiteSlug);
  const views = useWebsiteViews();
  const pathname = usePathname();

  // Extract the inbox params from the pathname
  const {
    selectedConversationStatus,
    selectedConversationId,
    basePath,
    selectedViewId,
  } = useMemo(() => {
    const slug = pathname.split("/");

    return extractInboxParamsFromSlug({
      slug: slug || [],
      availableViews: views,
      websiteSlug,
    });
  }, [pathname, views, websiteSlug]);

  return (
    <ConversationsContext.Provider
      value={{
        openConversationCount: 40,
        resolvedConversationCount: 0,
        spamConversationCount: 0,
        archivedConversationCount: 0,
        conversations,
        selectedConversationStatus,
        selectedConversationId,
        basePath,
        selectedViewId,
        isLoading,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationsContext);

  if (!context) {
    throw new Error(
      "useConversations must be used within a ConversationsProvider"
    );
  }

  if (context.isLoading) {
    throw new Error("Conversations not found");
  }

  return context;
}
