"use client";

import { use } from "react";
import { Conversation } from "@/components/conversation";
import { ConversationsList } from "@/components/conversations-list";
import { useInboxes } from "@/contexts/inboxes";
import { useUserSession } from "@/contexts/website";

type DashboardPageProps = {
	params: Promise<{
		websiteSlug: string;
		slug: string[];
	}>;
};

export default function ConversationRouterPage({ params }: DashboardPageProps) {
	const { websiteSlug } = use(params);
	const { user } = useUserSession();

	const {
		selectedConversationId,
		conversations,
		selectedConversationStatus,
		basePath,
		selectedVisitorId,
	} = useInboxes();

	return selectedConversationId && selectedVisitorId ? (
		<Conversation
			conversationId={selectedConversationId}
			currentUserId={user.id}
			visitorId={selectedVisitorId}
			websiteSlug={websiteSlug}
		/>
	) : (
		<ConversationsList
			basePath={basePath}
			conversations={conversations}
			selectedConversationStatus={selectedConversationStatus}
			websiteSlug={websiteSlug}
		/>
	);
}
