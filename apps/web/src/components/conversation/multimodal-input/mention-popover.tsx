"use client";

import type { CaretCoordinates, Mention } from "@cossistant/tiny-markdown";
import { Avatar } from "@/components/ui/avatar";
import Icon from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type MentionPopoverProps = {
	isActive: boolean;
	results: Mention[];
	highlightedIndex: number;
	isLoading: boolean;
	caretPosition: CaretCoordinates | null;
	onSelect: (mention: Mention) => void;
	containerRef: React.RefObject<HTMLDivElement | null>;
};

function getEntityIcon(type: string) {
	switch (type) {
		case "ai-agent":
			return <Icon className="size-3" name="agent" />;
		case "visitor":
			return <Icon className="size-3" name="contacts" />;
		default:
			return null;
	}
}

function getEntityLabel(type: string) {
	switch (type) {
		case "ai-agent":
			return "AI Agent";
		case "human-agent":
			return "Team";
		case "visitor":
			return "Visitor";
		default:
			return "";
	}
}

export function MentionPopover({
	isActive,
	results,
	highlightedIndex,
	isLoading,
	caretPosition,
	onSelect,
	containerRef,
}: MentionPopoverProps) {
	if (!(isActive && caretPosition)) {
		return null;
	}

	// Calculate position relative to the container
	const style: React.CSSProperties = {
		position: "absolute",
		bottom: "100%",
		left: Math.max(0, caretPosition.left - 8),
		marginBottom: 8,
		zIndex: 50,
	};

	return (
		<div
			className="min-w-[200px] max-w-[300px] overflow-hidden rounded-md border bg-popover shadow-md"
			style={style}
		>
			{isLoading ? (
				<div className="flex items-center justify-center p-3 text-muted-foreground text-sm">
					<div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					Searching...
				</div>
			) : results.length === 0 ? (
				<div className="p-3 text-center text-muted-foreground text-sm">
					No results found
				</div>
			) : (
				<div className="max-h-[200px] overflow-y-auto py-1">
					{results.map((mention, index) => (
						<button
							className={cn(
								"flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
								index === highlightedIndex
									? "bg-accent text-accent-foreground"
									: "hover:bg-muted"
							)}
							key={mention.id}
							onClick={() => onSelect(mention)}
							type="button"
						>
							<Avatar
								className="size-6"
								fallbackName={mention.name}
								url={mention.avatar}
							/>
							<div className="flex flex-1 flex-col">
								<span className="font-medium">{mention.name}</span>
							</div>
							<span className="flex items-center gap-1 text-muted-foreground text-xs">
								{getEntityIcon(mention.type)}
								{getEntityLabel(mention.type)}
							</span>
						</button>
					))}
				</div>
			)}
			<div className="border-t bg-muted/50 px-3 py-1.5 text-muted-foreground text-xs">
				<span className="font-mono text-[10px]">↑↓</span> to navigate,{" "}
				<span className="font-mono text-[10px]">↵</span> to select,{" "}
				<span className="font-mono text-[10px]">esc</span> to dismiss
			</div>
		</div>
	);
}
