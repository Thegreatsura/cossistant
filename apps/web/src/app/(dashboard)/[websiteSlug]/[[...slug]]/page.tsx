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
	const { slug } = use(params);
	const views = useWebsiteViews();

	const { selectedConversationStatus, selectedConversationId } =
		extractInboxParamsFromSlug({ slug, availableViews: views });

	return (
		<>
			<Page className="flex items-center justify-center px-3">
				<PageHeader>
					<PageHeaderTitle>
						{selectedConversationStatus || "Inbox"}
					</PageHeaderTitle>
				</PageHeader>
				{selectedConversationId ? (
					<Conversation conversationId={selectedConversationId} />
				) : (
					<ConversationsList />
				)}
			</Page>
		</>
	);
}
