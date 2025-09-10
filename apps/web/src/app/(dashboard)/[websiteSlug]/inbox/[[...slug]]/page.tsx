"use client";

import { use } from "react";
import { Conversation } from "@/components/conversation";
import { ConversationsList } from "@/components/conversations-list";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { useWebsiteViews } from "@/contexts/dashboard/website-context";
import { extractInboxParamsFromSlug } from "@/lib/url";

interface DashboardPageProps {
  params: Promise<{
    websiteSlug: string;
    slug: string[];
  }>;
}

export default function RouterPage({ params }: DashboardPageProps) {
  const { slug, websiteSlug } = use(params);
  const views = useWebsiteViews();

  const {
    selectedConversationStatus,
    selectedConversationId,
    basePath,
    selectedView,
  } = extractInboxParamsFromSlug({
    slug: slug || [],
    availableViews: views,
    websiteSlug,
  });

  return selectedConversationId ? (
    <Conversation conversationId={selectedConversationId} />
  ) : (
    <ConversationsList
      basePath={basePath}
      selectedConversationStatus={selectedConversationStatus}
      selectedView={selectedView}
    />
  );
}
