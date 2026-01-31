"use client";

import { cn } from "@/lib/utils";
import type { SortMode } from "./types";

type InboxModeTabsProps = {
	mode: SortMode;
	onModeChange: (mode: SortMode) => void;
};

export function InboxModeTabs({ mode, onModeChange }: InboxModeTabsProps) {
	return (
		<div className="flex items-center rounded-md border border-border/50 bg-muted/30 p-0.5">
			<button
				className={cn(
					"rounded px-2.5 py-1 font-medium text-xs transition-colors",
					mode === "smart"
						? "bg-background text-primary shadow-sm"
						: "text-muted-foreground hover:text-primary"
				)}
				onClick={() => onModeChange("smart")}
				type="button"
			>
				Smart
			</button>
			<button
				className={cn(
					"rounded px-2.5 py-1 font-medium text-xs transition-colors",
					mode === "lastMessage"
						? "bg-background text-primary shadow-sm"
						: "text-muted-foreground hover:text-primary"
				)}
				onClick={() => onModeChange("lastMessage")}
				type="button"
			>
				Recent
			</button>
		</div>
	);
}
