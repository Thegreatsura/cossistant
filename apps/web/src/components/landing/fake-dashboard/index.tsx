"use client";

import { useCallback, useEffect, useState } from "react";
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
                                const nextView =
                                        previousView === "inbox"
                                                ? "conversation"
                                                : "inbox";

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
                                "@container relative size-full overflow-hidden bg-background-100 dark:bg-background",
                                className
                        )}
                >
                        <div className="pointer-events-auto absolute left-full top-1/2 z-50 ml-6 flex w-max -translate-y-1/2 flex-col gap-2">
                                <button
                                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-background-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        onClick={focusInbox}
                                        type="button"
                                >
                                        Focus inbox
                                </button>
                                <button
                                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-background-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        onClick={focusConversation}
                                        type="button"
                                >
                                        Focus conversation
                                </button>
                                <button
                                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-background-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={isCycling}
                                        onClick={resumeCycling}
                                        type="button"
                                >
                                        Resume cycling
                                </button>
                        </div>
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
