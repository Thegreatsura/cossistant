"use client";

import { useInboxes } from "@/contexts/inboxes";
import { PageHeader, PageHeaderTitle } from "../../ui/layout";
import { ConversationHeaderNavigation } from "./navigation";

export function ConversationHeader() {
	const { selectedConversationId } = useInboxes();

	return (
		<PageHeader className="pl-3.5">
			<ConversationHeaderNavigation />
			<PageHeaderTitle>Conversation {selectedConversationId}</PageHeaderTitle>
		</PageHeader>
	);
}
