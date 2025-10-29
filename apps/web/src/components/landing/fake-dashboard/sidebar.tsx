"use client";

import { SidebarContainer } from "@/components/ui/layout/sidebars/container";
import { ResizableSidebar } from "@/components/ui/layout/sidebars/resizable-sidebar";
import { SidebarItem } from "@/components/ui/layout/sidebars/sidebar-item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FakeDashboardView } from "./types";

type FakeSidebarProps = {
        activeView: FakeDashboardView;
        openCount: number;
};

export function FakeSidebar({ activeView, openCount }: FakeSidebarProps) {
        return (
                <ResizableSidebar className="border-transparent" position="left">
                        <SidebarContainer
                                footer={
                                        <div className="mt-6 flex flex-col gap-2 text-xs text-primary/60">
                                                <Separator className="opacity-20" />
                                                <p className="font-medium">Quick links</p>
                                                <div className="grid gap-1">
                                                        <SidebarPlaceholderLink label="Docs" />
                                                        <SidebarPlaceholderLink label="Settings" />
                                                </div>
                                        </div>
                                }
                        >
                                <SidebarItem active={activeView === "inbox"} iconName="inbox-zero">
                                        Inbox
                                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-primary text-[10px]">
                                                {openCount}
                                        </span>
                                </SidebarItem>
                                <SidebarItem iconName="conversation-resolved">Resolved</SidebarItem>
                                <SidebarItem iconName="conversation-spam">Spam</SidebarItem>
                                <SidebarItem iconName="archive">Archived</SidebarItem>
                        </SidebarContainer>
                </ResizableSidebar>
        );
}

type SidebarPlaceholderLinkProps = {
        label: string;
};

function SidebarPlaceholderLink({ label }: SidebarPlaceholderLinkProps) {
        return (
                <span
                        className={cn(
                                "flex items-center justify-between rounded-md px-3 py-1 text-primary/70 transition-colors",
                                "bg-background-100/80 dark:bg-background-200/60"
                        )}
                >
                        {label}
                        <span aria-hidden className="text-primary/30">↗</span>
                </span>
        );
}
