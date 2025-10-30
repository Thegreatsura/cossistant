"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FakeConversation } from "./fake-conversation";
import { useFakeConversation } from "./fake-conversation/use-fake-conversation";
import { FakeInbox } from "./fake-inbox";
import { useFakeInbox } from "./fake-inbox/use-fake-inbox";
import { FakeCentralContainer } from "./fake-layout";
import { FakeNavigationTopbar } from "./fake-navigation-topbar";
import "./fake-dashboard.css";

export function FakeDashboard({ className }: { className?: string }) {
	const [activeView, setActiveView] = useState<"inbox" | "conversation">(
		"conversation"
	);
	const [isCycling, setIsCycling] = useState(true);
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

	const resetDemoData = useCallback(() => {
		resetInboxDemoData();
		resetConversationDemoData();
	}, [resetInboxDemoData, resetConversationDemoData]);

	useEffect(() => {
		if (!isCycling) {
			return;
		}

		const interval = window.setInterval(() => {
			setActiveView((previousView) => {
				const nextView = previousView === "inbox" ? "conversation" : "inbox";

				resetDemoData();

				return nextView;
			});
		}, 8000);

		return () => {
			window.clearInterval(interval);
		};
	}, [isCycling, resetDemoData]);

	const focusInbox = () => {
		setActiveView("inbox");
		setIsCycling(false);
	};

	const focusConversation = () => {
		setActiveView("conversation");
		setIsCycling(false);
	};

	const resumeCycling = () => {
		if (isCycling) {
			return;
		}

		resetDemoData();
		setIsCycling(true);
	};

	return (
		<div
			className={cn(
				"@container relative flex h-full w-full flex-col overflow-hidden bg-background-100 dark:bg-background",
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
