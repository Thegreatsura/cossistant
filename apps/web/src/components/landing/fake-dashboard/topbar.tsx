"use client";

import { Button } from "@/components/ui/button";
import Icon, { type IconName } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { FakeDashboardView } from "./types";

type FakeTopbarProps = {
        view: FakeDashboardView;
        onSelectView?: (view: FakeDashboardView) => void;
};

export function FakeTopbar({ view, onSelectView }: FakeTopbarProps) {
        return (
                <header className="flex h-16 min-h-16 items-center justify-between gap-4 px-6">
                        <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                        <Logo className="size-6 text-primary" />
                                        <span className="font-semibold text-primary text-sm">Cossistant</span>
                                </div>
                                <nav className="flex items-center gap-2">
                                        <TopbarChip
                                                active={view === "inbox"}
                                                iconName="inbox-zero"
                                                label="Inbox"
                                                onClick={() => onSelectView?.("inbox")}
                                        />
                                        <TopbarChip
                                                active={view === "conversation"}
                                                iconName="conversation"
                                                label="Conversation"
                                                onClick={() => onSelectView?.("conversation")}
                                        />
                                </nav>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-xs">
                                <span className="flex items-center gap-2">
                                        <span aria-hidden className="size-2 animate-pulse rounded-full bg-cossistant-green" />
                                        <span>3 visitors online</span>
                                </span>
                                <div className="hidden items-center gap-2 md:flex">
                                        <span className="rounded-full bg-background-100 px-3 py-1 text-primary text-xs dark:bg-background-200">
                                                Demo mode
                                        </span>
                                </div>
                        </div>
                </header>
        );
}

type TopbarChipProps = {
        active: boolean;
        iconName: IconName;
        label: string;
        onClick: () => void;
};

function TopbarChip({ active, iconName, label, onClick }: TopbarChipProps) {
        return (
                <Button
                        className={cn(
                                "flex items-center gap-2 px-3 text-xs",
                                active
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background-100 text-primary/70 hover:text-primary"
                        )}
                        onClick={onClick}
                        size="sm"
                        type="button"
                        variant="ghost"
                >
                        <Icon name={iconName} />
                        {label}
                </Button>
        );
}
