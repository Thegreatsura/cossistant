"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FakeConversationView } from "./conversation-view";
import { FakeInboxView } from "./inbox-view";
import { FakeSidebar } from "./sidebar";
import { FakeTopbar } from "./topbar";
import type {
        FakeConversationMessage,
        FakeConversationSummary,
        FakeDashboardProps,
        FakeDashboardView,
        FakeVisitorProfile,
} from "./types";

const DEFAULT_CONVERSATIONS: FakeConversationSummary[] = [
        {
                id: "conv-1",
                visitorName: "Olivia Rhye",
                lastMessagePreview: "That walkthrough was super helpful—thank you!",
                lastActiveLabel: "2m ago",
                unread: true,
                waitingSinceLabel: "Waiting for 2h",
                tags: ["Docs", "Onboarding"],
        },
        {
                id: "conv-2",
                visitorName: "Phoenix Baker",
                lastMessagePreview: "Could you confirm if the API limit resets daily?",
                lastActiveLabel: "14m ago",
        },
        {
                id: "conv-3",
                visitorName: "Lana Steiner",
                lastMessagePreview: "Amazing. Shipping the update tonight 🚀",
                lastActiveLabel: "1h ago",
        },
        {
                id: "conv-4",
                visitorName: "Demi Wilkinson",
                lastMessagePreview: "Attached the import CSV—let me know if you see the same error.",
                lastActiveLabel: "2h ago",
        },
];

const DEFAULT_MESSAGES: FakeConversationMessage[] = [
        {
                id: "msg-1",
                sender: "visitor",
                name: "Olivia Rhye",
                timestampLabel: "9:41 AM",
                content:
                        "Morning! I invited our onboarding team and they're already asking about workspace permissions.",
        },
        {
                id: "msg-2",
                sender: "agent",
                name: "You",
                timestampLabel: "9:42 AM",
                content:
                        "Happy to help! Team members inherit workspace permissions by default. Do you want them to manage billing as well?",
        },
        {
                id: "msg-3",
                sender: "visitor",
                name: "Olivia Rhye",
                timestampLabel: "9:44 AM",
                content:
                        "Yes please—that would let them track usage while we test the AI scenarios.",
        },
        {
                id: "msg-4",
                sender: "agent",
                name: "You",
                timestampLabel: "9:45 AM",
                content:
                        "Perfect. I've enabled finance permissions and added a quick primer on suggested automations so they can experiment right away.",
                emphasis: "highlight",
        },
        {
                id: "msg-5",
                sender: "system",
                name: "System",
                timestampLabel: "9:45 AM",
                content: "Automation 'Qualified lead follow-up' triggered",
                emphasis: "subtle",
        },
];

const DEFAULT_VISITOR: FakeVisitorProfile = {
        name: "Olivia Rhye",
        email: "olivia@untitledui.com",
        country: "United States",
        timeZone: "America/Los_Angeles",
        localTimeLabel: "6:45 AM (UTC-7)",
        plan: "Growth trial",
        lastSeenLabel: "Active 2 minutes ago",
};

export function FakeDashboard({
        className,
        initialView = "inbox",
        onViewChange,
        conversations = DEFAULT_CONVERSATIONS,
        messages = DEFAULT_MESSAGES,
        visitor = DEFAULT_VISITOR,
}: FakeDashboardProps) {
        const [view, setView] = useState<FakeDashboardView>(initialView);

        useEffect(() => {
                setView(initialView);
        }, [initialView]);

        const totalOpen = useMemo(
                () => conversations.filter((conversation) => conversation.unread).length || 0,
                [conversations]
        );

        const handleViewChange = (nextView: FakeDashboardView) => {
                setView(nextView);
                onViewChange?.(nextView);
        };

        return (
                <div
                        className={cn(
                                "relative flex w-full flex-col overflow-hidden rounded-3xl border border-primary/10 bg-background/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-primary/5 dark:bg-background-50/90",
                                className
                        )}
                >
                        <FakeTopbar onSelectView={handleViewChange} view={view} />
                        <div className="flex flex-1 gap-0 px-4 pb-5">
                                <FakeSidebar activeView={view} openCount={totalOpen} />
                                <section className="flex h-full flex-1 overflow-hidden rounded-2xl border border-primary/10 bg-background/80 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] dark:border-primary/5 dark:bg-background-50/60">
                                        {view === "inbox" ? (
                                                <FakeInboxView conversations={conversations} />
                                        ) : (
                                                <FakeConversationView messages={messages} visitor={visitor} />
                                        )}
                                </section>
                        </div>
                </div>
        );
}
