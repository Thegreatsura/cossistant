"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, RefObject, useRef } from "react";
import { ConversationItem } from "@/components/conversations-list/conversation-item";
import type { ConversationHeader } from "@/contexts/inboxes";
import { PageContent } from "../ui/layout";
import { useConversationKeyboardNavigation } from "./use-conversation-keyboard-navigation";

type ConversationsListProps = {
	basePath: string;
	conversations: ConversationHeader[];
	showWaitingForReplyPill: boolean;
	websiteSlug: string;
};

const ITEM_HEIGHT = 52;

const VirtualConversationItem = memo(
	({
		conversation,
		href,
		websiteSlug,
		focused,
		showWaitingForReplyPill,
		onMouseEnter,
	}: {
		conversation: ConversationHeader;
		href: string;
		websiteSlug: string;
		focused: boolean;
		showWaitingForReplyPill: boolean;
		onMouseEnter: () => void;
	}) => (
		<ConversationItem
			focused={focused}
			header={conversation}
			href={href}
			key={conversation.id}
			setFocused={onMouseEnter}
			showWaitingForReplyPill={showWaitingForReplyPill}
			websiteSlug={websiteSlug}
		/>
	)
);

VirtualConversationItem.displayName = "VirtualConversationItem";

export function VirtualizedConversations({
	basePath,
	conversations,
	showWaitingForReplyPill,
	websiteSlug,
}: ConversationsListProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	const { focusedIndex, handleMouseEnter } = useConversationKeyboardNavigation({
		conversations,
		basePath,
		parentRef,
		itemHeight: ITEM_HEIGHT,
		enabled: true,
	});

	const virtualizer = useVirtualizer({
		count: conversations.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ITEM_HEIGHT,
		gap: 4,
		overscan: 4,
	});

	const virtualItems = virtualizer.getVirtualItems();

	return (
		<PageContent
			className="h-full overflow-auto px-2 contain-strict"
			ref={parentRef}
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => {
					// biome-ignore lint/style/noNonNullAssertion: should never happen
					const conversation = conversations[virtualItem.index]!;
					const href = `${basePath}/${conversation.id}`;

					return (
						<div
							key={virtualItem.key}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: `${virtualItem.size}px`,
								transform: `translateY(${virtualItem.start}px)`,
							}}
						>
							<VirtualConversationItem
								conversation={conversation}
								focused={focusedIndex === virtualItem.index}
								href={href}
								onMouseEnter={() => handleMouseEnter(virtualItem.index)}
								showWaitingForReplyPill={showWaitingForReplyPill}
								websiteSlug={websiteSlug}
							/>
						</div>
					);
				})}
			</div>
		</PageContent>
	);
}
