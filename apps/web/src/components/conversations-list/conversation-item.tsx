"use client";

import type { Message } from "@cossistant/types";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMins < 60) {
		return `${diffMins}m`;
	}
	if (diffHours < 24) {
		return `${diffHours}h`;
	}
	return `${diffDays}d`;
}

interface ConversationItemProps {
	href: string;
	avatar?: string;
	name: string;
	time?: Date;
	unread?: boolean;
	active?: boolean;
	online?: boolean;
	className?: string;
	lastMessage: Message | null;
}

export function ConversationItem({
	href,
	avatar,
	name,
	time,
	unread = false,
	active = false,
	online = false,
	className,
	lastMessage,
}: ConversationItemProps) {
	return (
		<Link
			className={cn(
				"group/conversation-item relative flex items-center gap-3 rounded-[2px] px-2 py-2 text-sm transition-colors duration-100",
				"hover:bg-background-100 hover:text-primary dark:hover:bg-background-200",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				active && "bg-background-200 text-accent-foreground",
				className
			)}
			href={href}
			prefetch="auto"
		>
			<div className="relative">
				<Avatar className="size-6 shrink-0">
					<AvatarImage alt={name} src={avatar} />
					<AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
				{online && (
					<div className="absolute right-0 bottom-0 size-1 rounded-[1px] bg-co-blue ring-2 ring-background group-hover/conversation-item:ring-background-400" />
				)}
			</div>

			<div className="flex min-w-0 flex-1 items-center gap-4">
				<div className="mb-0.5 flex items-baseline justify-between gap-2">
					<h4
						className={cn(
							"truncate font-medium md:w-[200px]",
							unread && "font-semibold"
						)}
					>
						{name}
					</h4>
				</div>
				<p
					className={cn(
						"truncate pr-6 text-muted-foreground",
						unread && "font-medium text-foreground"
					)}
				>
					{lastMessage?.bodyMd}
				</p>
			</div>
			{time && (
				<span className="shrink-0 text-muted-foreground">
					{formatTimeAgo(time)}
				</span>
			)}
		</Link>
	);
}
