"use client";

import type { ConversationStatus } from "@cossistant/types";
import { useEffect } from "react";
import { ConversationsList } from "@/components/conversations-list";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useConversationFocusStore } from "@/contexts/inboxes/conversation-focus-store";
import { useSidebar } from "@/hooks/use-sidebars";

type ConversationsListPaneProps = {
	basePath: string;
	selectedConversationStatus: ConversationStatus | "archived" | null;
	conversations: ConversationHeader[];
	websiteSlug: string;
};

export function ConversationsListPane({
	basePath,
	selectedConversationStatus,
	conversations,
	websiteSlug,
}: ConversationsListPaneProps) {
	const clearFocus = useConversationFocusStore((state) => state.clearFocus);
	const { open: isLeftSidebarOpen, toggle: toggleLeftSidebar } = useSidebar({
		position: "left",
	});

	useEffect(() => {
		clearFocus();
	}, [clearFocus, selectedConversationStatus]);

	return (
		<ConversationsList
			basePath={basePath}
			conversations={conversations}
			isLeftSidebarOpen={isLeftSidebarOpen}
			onToggleLeftSidebar={toggleLeftSidebar}
			selectedConversationStatus={selectedConversationStatus}
			websiteSlug={websiteSlug}
		/>
	);
}
