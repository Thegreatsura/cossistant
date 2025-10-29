"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Page, PageContent, PageHeader } from "@/components/ui/layout";
import { ResizableSidebar } from "@/components/ui/layout/sidebars/resizable-sidebar";
import { SidebarContainer } from "@/components/ui/layout/sidebars/container";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FakeConversationMessage, FakeVisitorProfile } from "./types";

type FakeConversationViewProps = {
        messages: FakeConversationMessage[];
        visitor: FakeVisitorProfile;
};

export function FakeConversationView({ messages, visitor }: FakeConversationViewProps) {
        return (
                <div className="flex h-full w-full">
                        <Page className="flex-1 border-r border-primary/10 bg-background-50/30 dark:border-primary/5 dark:bg-background-100/10">
                                <PageHeader className="border-b border-primary/10 bg-transparent pr-6 pl-4 dark:border-primary/5">
                                        <div className="flex items-center gap-2">
                                                <TooltipOnHover content="Back to list" shortcuts={["["]}>
                                                        <Button className="ml-0.5" size="icon-small" variant="ghost">
                                                                <Icon name="arrow-left" />
                                                        </Button>
                                                </TooltipOnHover>
                                                <ConversationHeaderTitle visitor={visitor} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                                <Button size="sm" variant="ghost">
                                                        <Icon name="conversation-resolved" />
                                                        Resolve
                                                </Button>
                                                <Button size="sm" variant="ghost">
                                                        <Icon name="archive" />
                                                        Archive
                                                </Button>
                                                <Button className="hidden sm:flex" size="sm" variant="default">
                                                        <Icon name="send" />
                                                        Reply
                                                </Button>
                                        </div>
                                </PageHeader>
                                <PageContent className="flex flex-1 flex-col gap-3 overflow-hidden bg-transparent px-4 py-6">
                                        <div className="flex-1 space-y-4 overflow-auto pr-2">
                                                {messages.map((message) => (
                                                        <MessageBubble key={message.id} message={message} />
                                                ))}
                                        </div>
                                        <ComposerPlaceholder />
                                </PageContent>
                        </Page>
                        <FakeVisitorSidebar visitor={visitor} />
                </div>
        );
}

type ConversationHeaderTitleProps = {
        visitor: FakeVisitorProfile;
};

function ConversationHeaderTitle({ visitor }: ConversationHeaderTitleProps) {
        return (
                <div className="flex items-center gap-3">
                        <Avatar className="size-9" fallbackName={visitor.name} withBoringAvatar />
                        <div>
                                <p className="font-semibold text-primary text-sm">{visitor.name}</p>
                                <p className="text-primary/70 text-xs">Active conversation • {visitor.plan ?? "Trial"}</p>
                        </div>
                </div>
        );
}

type MessageBubbleProps = {
        message: FakeConversationMessage;
};

function MessageBubble({ message }: MessageBubbleProps) {
        const isAgent = message.sender === "agent";
        const isSystem = message.sender === "system";
        return (
                <div className={cn("flex w-full gap-3", isAgent && "justify-end")} data-role={message.sender}>
                        {!isAgent ? (
                                <Avatar className="mt-0.5 size-8" fallbackName={message.name} withBoringAvatar />
                        ) : null}
                        <div className={cn("max-w-[70%] space-y-2", isAgent && "items-end text-right")} data-emphasis={message.emphasis}>
                                <div className="flex items-center gap-2 text-primary/60 text-[11px]">
                                        <span className="font-medium text-primary/80 text-xs">{message.name}</span>
                                        <span>{message.timestampLabel}</span>
                                </div>
                                <div
                                        className={cn(
                                                "rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed shadow-sm",
                                                isAgent
                                                        ? "border-primary/20 bg-primary text-primary-foreground"
                                                        : "border-primary/10 bg-background",
                                                isSystem && "border-dashed text-primary/70"
                                        )}
                                >
                                        {message.content}
                                </div>
                                {message.emphasis === "highlight" ? (
                                        <Badge className="bg-primary/10 text-primary" variant="outline">
                                                Suggested automation
                                        </Badge>
                                ) : null}
                        </div>
                        {isAgent ? (
                                <Avatar className="mt-0.5 size-8" fallbackName="You" withBoringAvatar />
                        ) : null}
                </div>
        );
}

function ComposerPlaceholder() {
        return (
                <div className="rounded-2xl border border-primary/10 bg-background px-4 py-3 shadow-inner dark:border-primary/5">
                        <div className="flex items-center justify-between gap-3">
                                <span className="text-primary/50 text-sm">Type your reply…</span>
                                <div className="flex items-center gap-2 text-primary/50">
                                        <Icon name="attachment" />
                                        <Icon name="command" />
                                        <Button size="sm">
                                                <Icon name="send" />
                                                Send
                                        </Button>
                                </div>
                        </div>
                </div>
        );
}

type FakeVisitorSidebarProps = {
        visitor: FakeVisitorProfile;
};

function FakeVisitorSidebar({ visitor }: FakeVisitorSidebarProps) {
        return (
                <ResizableSidebar className="hidden border-transparent lg:flex" position="right">
                        <SidebarContainer>
                                <div className="flex items-center gap-3 rounded-2xl bg-background px-3 py-3 shadow-sm dark:bg-background-100">
                                        <Avatar className="size-10" fallbackName={visitor.name} withBoringAvatar />
                                        <div className="space-y-1">
                                                <p className="font-semibold text-primary text-sm">{visitor.name}</p>
                                                <p className="text-primary/60 text-xs">{visitor.email ?? "Not identified yet"}</p>
                                        </div>
                                </div>
                                <div className="mt-5 space-y-3 text-primary/70 text-xs">
                                        <VisitorFact label="Plan" value={visitor.plan ?? "Growth"} />
                                        <VisitorFact label="Last seen" value={visitor.lastSeenLabel ?? "2 minutes ago"} />
                                        <VisitorFact label="Country" value={visitor.country ?? "United States"} />
                                        <VisitorFact label="Local time" value={visitor.localTimeLabel ?? "12:04 PM (UTC-5)"} />
                                </div>
                        </SidebarContainer>
                </ResizableSidebar>
        );
}

type VisitorFactProps = {
        label: string;
        value: string;
};

function VisitorFact({ label, value }: VisitorFactProps) {
        return (
                <div className="flex items-center justify-between rounded-lg bg-background-100/60 px-3 py-2 dark:bg-background-200/50">
                        <span className="font-medium text-primary/60">{label}</span>
                        <span className="text-primary text-xs">{value}</span>
                </div>
        );
}
