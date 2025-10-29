"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FakeConversation } from "./fake-conversation";
import { useFakeConversation } from "./fake-conversation/use-fake-conversation";
import { FakeInbox } from "./fake-inbox";
import { useFakeInbox } from "./fake-inbox/use-fake-inbox";
import { FakeCentralContainer } from "./fake-layout";
import { FakeNavigationTopbar } from "./fake-navigation-topbar";

export function FakeDashboard({ className }: { className?: string }) {
	const [activeView, setActiveView] = useState<"inbox" | "conversation">(
		"conversation"
	);
	const {
		conversations,
		typingVisitors: inboxTypingVisitors,
		resetDemoData: resetInboxDemoData,
	} = useFakeInbox();

	const {
		conversation,
		visitor,
		timelineItems,
		typingVisitors: conversationTypingVisitors,
		resetDemoData: resetConversationDemoData,
	} = useFakeConversation();

	const resetDemoData = () => {
		resetInboxDemoData();
		resetConversationDemoData();
	};

	return (
		<div
			className={cn(
				"@container size-full overflow-hidden bg-background-100 dark:bg-background",
				className
			)}
		>
			<FakeNavigationTopbar />
			<FakeCentralContainer>
				{activeView === "inbox" ? (
					<FakeInbox
						conversations={conversations}
						typingVisitors={inboxTypingVisitors}
					/>
				) : (
					<FakeConversation
						conversation={conversation}
						timeline={timelineItems}
						typingVisitors={conversationTypingVisitors}
						visitor={visitor}
					/>
				)}
			</FakeCentralContainer>
		</div>
	);
}
