"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Page, PageContent, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FakeConversationSummary } from "./types";

type FakeInboxViewProps = {
        conversations: FakeConversationSummary[];
};

export function FakeInboxView({ conversations }: FakeInboxViewProps) {
        return (
                <Page className="border-r border-primary/10 bg-background-50/40 dark:border-primary/5 dark:bg-background-100/10">
                        <PageHeader className="border-b border-primary/10 bg-transparent pr-6 pl-4 dark:border-primary/5">
                                <div className="flex items-center gap-2">
                                        <TooltipOnHover content="Toggle sidebar" shortcuts={["["]}>
                                                <Button className="ml-0.5" size="icon-small" variant="ghost">
                                                        <Icon filledOnHover name="sidebar-collapse" />
                                                </Button>
                                        </TooltipOnHover>
                                        <PageHeaderTitle>Inbox</PageHeaderTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost">
                                                <Icon name="menu" />
                                                Views
                                        </Button>
                                        <Button className="hidden sm:flex" size="sm">
                                                <Icon name="plus" />
                                                New view
                                        </Button>
                                </div>
                        </PageHeader>
                        <PageContent className="flex-1 overflow-auto px-3 py-4">
                                <div className="space-y-2">
                                        {conversations.map((conversation) => (
                                                <FakeConversationListItem
                                                        key={conversation.id}
                                                        conversation={conversation}
                                                />
                                        ))}
                                </div>
                        </PageContent>
                </Page>
        );
}

type FakeConversationListItemProps = {
        conversation: FakeConversationSummary;
};

function FakeConversationListItem({ conversation }: FakeConversationListItemProps) {
        return (
                <div
                        className={cn(
                                "flex items-center justify-between gap-4 rounded-xl border border-transparent bg-background px-3 py-3",
                                "shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] transition hover:border-primary/10 hover:shadow-[0_18px_42px_-24px_rgba(15,23,42,0.5)] dark:bg-background-100"
                        )}
                >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                <Avatar className="size-10" fallbackName={conversation.visitorName} withBoringAvatar />
                                <div className="min-w-0">
                                        <p className="font-medium text-primary text-sm">
                                                {conversation.visitorName}
                                        </p>
                                        <p className="truncate text-primary/70 text-xs">
                                                {conversation.lastMessagePreview}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                                {conversation.tags?.map((tag) => (
                                                        <Badge key={tag} variant="secondary">
                                                                {tag}
                                                        </Badge>
                                                ))}
                                                {conversation.waitingSinceLabel ? (
                                                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning text-[10px]">
                                                                {conversation.waitingSinceLabel}
                                                        </span>
                                                ) : null}
                                        </div>
                                </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-primary/60 text-xs">
                                <span>{conversation.lastActiveLabel}</span>
                                {conversation.unread ? (
                                        <span className="inline-flex size-2 rounded-full bg-primary" />
                                ) : null}
                        </div>
                </div>
        );
}
