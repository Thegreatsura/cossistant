"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { ConversationHeader } from "@/contexts/inboxes";
import { usePrefetchConversationData } from "@/data/use-prefetch-conversation-data";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { generateVisitorName } from "@/lib/visitors";
import { ConversationBasicActions } from "../conversation/actions/basic";

interface ConversationItemProps {
	href: string;
	header: ConversationHeader;
	websiteSlug: string;
	focused?: boolean;
	setFocused?: () => void;
}

export function ConversationItem({
	href,
	header,
	websiteSlug,
	focused = false,
	setFocused,
}: ConversationItemProps) {
	const { visitor, lastMessagePreview } = header;
	const { prefetchConversation } = usePrefetchConversationData();

	const fullName =
		visitor.name || visitor.email || generateVisitorName(visitor.id);

	return (
		<Link
			className={cn(
				"group/conversation-item relative flex items-center gap-3 rounded-md px-2 py-2 text-sm",
				"focus-visible:outline-none focus-visible:ring-0",
				focused && "bg-background-200 dark:bg-background-300 text-primary",
			)}
			href={href}
			prefetch="auto"
			onMouseEnter={() => {
				setFocused?.();
				prefetchConversation({
					websiteSlug,
					conversationId: header.id,
					visitorId: header.visitorId,
				});
			}}
		>
			<Avatar
				url={visitor.avatar}
				fallbackName={fullName}
				lastOnlineAt={visitor.lastSeenAt}
				className="size-9"
			/>

			<div className="flex min-w-0 flex-1 items-center gap-1 md:gap-4">
				<p className="truncate min-w-[120px] max-w-[120px]">{fullName}</p>

				<p className={cn("truncate pr-6 text-muted-foreground")}>
					{lastMessagePreview?.bodyMd}
				</p>
			</div>
			<div className="flex items-center gap-1">
				{focused ? (
					<ConversationBasicActions />
				) : (
					<>
						{lastMessagePreview && (
							<span className="shrink-0 pr-2 text-primary/40 text-xs">
								{formatTimeAgo(lastMessagePreview.createdAt)}
							</span>
						)}
					</>
				)}
			</div>
		</Link>
	);
}
