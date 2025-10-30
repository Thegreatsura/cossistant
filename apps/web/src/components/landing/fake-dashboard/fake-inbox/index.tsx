"use client";

import type { ConversationHeader } from "@cossistant/types";
import { useRef } from "react";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";
import { FakeConversationList } from "./fake-conversation-list";
import { FakeMouseCursor } from "./fake-mouse-cursor";

type TypingVisitor = {
	conversationId: string;
	visitorId: string;
};

type Props = {
	conversations: ConversationHeader[];
	typingVisitors?: TypingVisitor[];
	showMouseCursor?: boolean;
	onMouseClick?: () => void;
};

export function FakeInbox({
	conversations,
	typingVisitors = [],
	showMouseCursor = false,
	onMouseClick,
}: Props) {
	const marcConversationRef = useRef<HTMLDivElement>(null);

	return (
		<>
			<FakeInboxNavigationSidebar
				activeView="inbox"
				open
				statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
			/>
			<Page className="relative px-0">
				<PageHeader className="px-4">
					<div className="flex items-center gap-2">
						<PageHeaderTitle className="capitalize">Inbox</PageHeaderTitle>
					</div>
				</PageHeader>

				<FakeConversationList
					conversations={conversations}
					marcConversationRef={marcConversationRef}
					typingVisitors={typingVisitors}
				/>
				{showMouseCursor && onMouseClick && (
					<FakeMouseCursor
						isVisible={showMouseCursor}
						onClick={onMouseClick}
						targetElementRef={marcConversationRef}
					/>
				)}
			</Page>
		</>
	);
}
