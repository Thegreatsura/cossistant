"use client";

import { formatDistanceToNow } from "date-fns";
import {
	BanIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ExternalLinkIcon,
	FileTextIcon,
	FolderIcon,
	MoreHorizontalIcon,
	RefreshCwIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
	Trash2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatBytes, getPathDisplayName } from "../utils";

type PageTreeItemViewProps = {
	// Content
	title: string | null;
	path: string;
	url: string;
	sizeBytes: number;
	updatedAt: string;

	// State
	isIncluded: boolean;
	hasChildren: boolean;
	isExpanded: boolean;
	depth: number;
	isGroup?: boolean;

	// Source info
	sourceUrl?: string;

	// Actions
	onToggleExpand?: () => void;
	onToggleIncluded?: () => void;
	onReindex?: () => void;
	onDelete?: () => void;
	onIgnore?: () => void;
	onViewContent?: () => void;

	// Loading states
	isToggling?: boolean;
	isReindexing?: boolean;
	isDeleting?: boolean;
	isIgnoring?: boolean;

	// Focus state
	focused?: boolean;
	rightContent?: ReactNode;
	className?: string;
};

export function PageTreeItemView({
	title,
	path,
	url,
	sizeBytes,
	updatedAt,
	isIncluded,
	hasChildren,
	isExpanded,
	depth,
	isGroup = false,
	sourceUrl,
	onToggleExpand,
	onToggleIncluded,
	onReindex,
	onDelete,
	onIgnore,
	onViewContent,
	isToggling = false,
	isReindexing = false,
	isDeleting = false,
	isIgnoring = false,
	focused = false,
	rightContent,
	className,
}: PageTreeItemViewProps) {
	const [isMounted, setIsMounted] = useState(false);
	const [formattedTime, setFormattedTime] = useState<string | null>(null);

	useEffect(() => {
		setIsMounted(true);
		if (updatedAt) {
			setFormattedTime(
				formatDistanceToNow(new Date(updatedAt), { addSuffix: true })
			);
		}
	}, [updatedAt]);

	const displayName = useMemo(
		() => title ?? getPathDisplayName(path),
		[title, path]
	);

	const displayPath = useMemo(() => (path === "/" ? "/" : path), [path]);

	const isAnyActionPending =
		isToggling || isReindexing || isDeleting || isIgnoring;

	// Choose icon based on whether this is a group (has children) or leaf
	const ItemIcon = isGroup || hasChildren ? FolderIcon : FileTextIcon;

	return (
		<div
			className={cn(
				"group/tree-item relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
				"transition-colors hover:bg-muted/50",
				"focus-visible:outline-none focus-visible:ring-0",
				focused && "bg-background-200 dark:bg-background-300",
				!isIncluded && "opacity-50",
				className
			)}
			style={{ paddingLeft: `${depth * 20 + 8}px` }}
		>
			{/* Expand/collapse button */}
			<button
				className={cn(
					"flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
					!hasChildren && "invisible"
				)}
				onClick={onToggleExpand}
				type="button"
			>
				{isExpanded ? (
					<ChevronDownIcon className="h-3.5 w-3.5" />
				) : (
					<ChevronRightIcon className="h-3.5 w-3.5" />
				)}
			</button>

			{/* Icon - folder for groups, file for leaves */}
			<ItemIcon
				className={cn(
					"h-4 w-4 shrink-0",
					isGroup || hasChildren
						? "text-amber-500 dark:text-amber-400"
						: "text-muted-foreground"
				)}
			/>

			{/* Page info - clickable to view content */}
			<button
				className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left transition-colors hover:text-primary"
				onClick={onViewContent}
				type="button"
			>
				<span className="truncate font-medium" title={title ?? url}>
					{displayName}
				</span>
				<span className="truncate text-muted-foreground text-xs" title={url}>
					{displayPath}
				</span>
			</button>

			{/* Right side info and actions */}
			<div className="flex items-center gap-2">
				{/* Training status indicator */}
				{!isIncluded && (
					<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
						Excluded
					</span>
				)}

				{/* Size */}
				<span className="shrink-0 text-muted-foreground text-xs">
					{formatBytes(sizeBytes)}
				</span>

				{/* Last crawled time */}
				{isMounted && formattedTime && (
					<span className="shrink-0 text-muted-foreground/60 text-xs">
						{formattedTime}
					</span>
				)}

				{/* Actions - visible on hover */}
				{rightContent || (
					<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/tree-item:opacity-100">
						{/* External link */}
						<Button
							asChild
							className="h-7 w-7 p-0"
							size="sm"
							title="Open page"
							variant="ghost"
						>
							<a href={url} rel="noopener noreferrer" target="_blank">
								<ExternalLinkIcon className="h-3.5 w-3.5" />
							</a>
						</Button>

						{/* Actions dropdown */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className="h-7 w-7 p-0"
									disabled={isAnyActionPending}
									size="sm"
									title="More actions"
									variant="ghost"
								>
									{isAnyActionPending ? (
										<Spinner className="h-3.5 w-3.5" />
									) : (
										<MoreHorizontalIcon className="h-3.5 w-3.5" />
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								{/* Reindex */}
								{onReindex && (
									<DropdownMenuItem
										disabled={isAnyActionPending}
										onClick={onReindex}
									>
										<RefreshCwIcon className="mr-2 h-4 w-4" />
										Re-index
									</DropdownMenuItem>
								)}

								{/* Toggle training inclusion */}
								{onToggleIncluded && (
									<DropdownMenuItem
										disabled={isAnyActionPending}
										onClick={onToggleIncluded}
									>
										{isIncluded ? (
											<>
												<ToggleLeftIcon className="mr-2 h-4 w-4" />
												Exclude from training
											</>
										) : (
											<>
												<ToggleRightIcon className="mr-2 h-4 w-4" />
												Include in training
											</>
										)}
									</DropdownMenuItem>
								)}

								<DropdownMenuSeparator />

								{/* Delete */}
								{onDelete && (
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										disabled={isAnyActionPending}
										onClick={onDelete}
									>
										<Trash2Icon className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								)}

								{/* Ignore */}
								{onIgnore && (
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										disabled={isAnyActionPending}
										onClick={onIgnore}
									>
										<BanIcon className="mr-2 h-4 w-4" />
										Ignore (exclude forever)
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>
		</div>
	);
}

export type { PageTreeItemViewProps };
