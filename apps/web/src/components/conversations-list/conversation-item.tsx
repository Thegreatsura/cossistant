"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { ConversationHeader } from "@/contexts/inboxes";
import { usePrefetchConversationData } from "@/data/use-prefetch-conversation-data";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import { ConversationBasicActions } from "../conversation/actions/basic";

type Props = {
	href: string;
	header: ConversationHeader;
	websiteSlug: string;
	focused?: boolean;
	setFocused?: () => void;
};

export function ConversationItem({
	href,
	header,
	websiteSlug,
	focused = false,
	setFocused,
}: Props) {
	const { visitor, lastMessagePreview } = header;
	const { prefetchConversation } = usePrefetchConversationData();

	const fullName = getVisitorNameWithFallback(visitor);

	return (
		<Link
			className={cn(
				"group/conversation-item relative flex items-center gap-3 rounded-md px-2 py-2 text-sm",
				"focus-visible:outline-none focus-visible:ring-0",
				focused && "bg-background-200 text-primary dark:bg-background-300"
			)}
			href={href}
			onMouseEnter={() => {
				setFocused?.();
				prefetchConversation({
					websiteSlug,
					conversationId: header.id,
					visitorId: header.visitorId,
				});
			}}
			prefetch="auto"
		>
			<Avatar
				className="size-9"
				fallbackName={fullName}
				lastOnlineAt={visitor.lastSeenAt}
				url={visitor.avatar}
			/>

			<div className="flex min-w-0 flex-1 items-center gap-1 md:gap-4">
				<p className="min-w-[120px] max-w-[120px] truncate">{fullName}</p>

				<p className={cn("truncate pr-6 text-muted-foreground")}>
					{lastMessagePreview?.bodyMd}
				</p>
			</div>
			<div className="flex items-center gap-1">
				{focused ? (
					<ConversationBasicActions
						conversationId={header.id}
						visitorId={header.visitorId}
					/>
				) : lastMessagePreview ? (
					<span className="shrink-0 pr-2 text-primary/40 text-xs">
						{formatTimeAgo(lastMessagePreview.createdAt)}
					</span>
				) : null}
			</div>
		</Link>
	);
}
