"use client";

import { useInboxes } from "@/contexts/inboxes";
import { PageHeader } from "../../ui/layout";
import { ConversationBasicActions } from "../actions/basic";
import { MoreConversationActions } from "../actions/more";
import { ConversationHeaderNavigation } from "./navigation";

export function ConversationHeader() {
	const { selectedConversationId } = useInboxes();

	if (!selectedConversationId) {
		return <></>;
	}

	return (
		<PageHeader className="z-10 border-primary/10 border-b bg-background pl-3.5 2xl:border-transparent 2xl:bg-transparent dark:bg-background-100 2xl:dark:bg-transparent">
			<ConversationHeaderNavigation />
			<div className="flex items-center gap-3">
				<ConversationBasicActions className="gap-3 pr-0" />
				<MoreConversationActions conversationId={selectedConversationId} />
			</div>
		</PageHeader>
	);
}
