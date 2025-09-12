"use client";

import type { ConversationStatus } from "@cossistant/types";
import type { ConversationHeader } from "@/contexts/inboxes";
import { Page, PageHeader, PageHeaderTitle } from "../ui/layout";
import { VirtualizedConversations } from "./virtualized-conversations";

type Props = {
	basePath: string;
	selectedConversationStatus: ConversationStatus | "archived" | null;
	conversations: ConversationHeader[];
};

export function ConversationsList({
	basePath,
	selectedConversationStatus,
	conversations,
}: Props) {
	return (
		<Page className="px-3">
			<PageHeader>
				<PageHeaderTitle className="capitalize">
					{selectedConversationStatus || "Inbox"}
				</PageHeaderTitle>
			</PageHeader>
			<div className="h-full w-full py-2">
				{conversations.length === 0 ? (
					<div className="mx-1 mt-4 flex flex-col gap-1 rounded border border-primary/10 border-dashed p-2 text-center">
						<p className="text-primary/40 text-xs">No conversations yet</p>
					</div>
				) : (
					<VirtualizedConversations
						basePath={basePath}
						conversations={conversations}
					/>
				)}
			</div>
		</Page>
	);
}
