"use client";

import { SupportConfig } from "@cossistant/next";
import { SenderType } from "@cossistant/types";
import { useInboxes } from "@/contexts/inboxes";
import { useUserSession } from "@/contexts/website";
import { ConversationPane } from "./conversation-pane";
import { ConversationsListPane } from "./conversations-list-pane";

type InboxClientProps = {
	websiteSlug: string;
};

export default function InboxClientRouter({ websiteSlug }: InboxClientProps) {
	const { user } = useUserSession();

	const {
		selectedConversationId,
		conversations,
		selectedConversationStatus,
		basePath,
		selectedVisitorId,
	} = useInboxes();

	return selectedConversationId && selectedVisitorId ? (
		<>
			<ConversationPane
				conversationId={selectedConversationId}
				currentUserId={user.id}
				visitorId={selectedVisitorId}
				websiteSlug={websiteSlug}
			/>
			<SupportConfig
				defaultMessages={[
					{
						content: `Hi ${user.name || "there"}, anything I can help with?`,
						senderType: SenderType.TEAM_MEMBER,
					},
				]}
				quickOptions={["How to identify a visitor?"]}
			/>
		</>
	) : (
		<>
			<ConversationsListPane
				basePath={basePath}
				conversations={conversations}
				selectedConversationStatus={selectedConversationStatus}
				websiteSlug={websiteSlug}
			/>
			<SupportConfig
				defaultMessages={[
					{
						content: `Hi ${user.name || "there"}, anything I can help with?`,
						senderType: SenderType.TEAM_MEMBER,
					},
				]}
			/>
		</>
	);
}
