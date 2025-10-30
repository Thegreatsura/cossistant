import type { ConversationHeader } from "@cossistant/types";
import { differenceInHours } from "date-fns";
import { useMemo } from "react";
import { ConversationItemView } from "@/components/conversations-list/conversation-item";
import { PageContent } from "@/components/ui/layout";
import { getWaitingSinceLabel } from "@/lib/date";
import { getVisitorNameWithFallback } from "@/lib/visitors";

type FakeConversationListItemProps = {
	conversation: ConversationHeader;
	isTyping?: boolean;
	itemRef?:
		| React.RefCallback<HTMLDivElement>
		| React.RefObject<HTMLDivElement | null>;
};

export function FakeConversationListItem({
	conversation,
	isTyping = false,
	itemRef,
}: FakeConversationListItemProps) {
	const visitorName = getVisitorNameWithFallback(conversation.visitor);
	const lastTimelineItem = conversation.lastTimelineItem;

	const lastTimelineItemCreatedAt = lastTimelineItem?.createdAt
		? new Date(lastTimelineItem.createdAt)
		: null;

	// Calculate if message is unread (from visitor and no lastSeenAt)
	const hasUnreadMessage = useMemo(() => {
		if (!lastTimelineItemCreatedAt) {
			return false;
		}

		if (!lastTimelineItem) {
			return false;
		}

		// Check if the last message is from a visitor (not from userId)
		const isFromVisitor = Boolean(
			lastTimelineItem.visitorId && !lastTimelineItem.userId
		);

		if (!isFromVisitor) {
			return false;
		}

		// If there's no lastSeenAt, it means it hasn't been seen
		const headerLastSeenAt = conversation.lastSeenAt
			? new Date(conversation.lastSeenAt)
			: null;

		return !headerLastSeenAt || lastTimelineItemCreatedAt > headerLastSeenAt;
	}, [lastTimelineItem, lastTimelineItemCreatedAt, conversation.lastSeenAt]);

	// Calculate waiting label for messages older than 8 hours from visitors
	const waitingSinceLabel = useMemo(() => {
		if (!lastTimelineItemCreatedAt) {
			return null;
		}

		if (!lastTimelineItem) {
			return null;
		}

		// Only show for visitor messages
		const isFromVisitor = Boolean(
			lastTimelineItem.visitorId && !lastTimelineItem.userId
		);

		if (!isFromVisitor) {
			return null;
		}

		const now = new Date();
		const hoursAgo = differenceInHours(now, lastTimelineItemCreatedAt);

		// Only show waiting label if message is older than 8 hours
		if (hoursAgo < 8) {
			return null;
		}

		return getWaitingSinceLabel(lastTimelineItemCreatedAt);
	}, [lastTimelineItem, lastTimelineItemCreatedAt]);

	return (
		<div
			ref={(element) => {
				if (itemRef) {
					if (typeof itemRef === "function") {
						itemRef(element);
					} else if ("current" in itemRef) {
						(itemRef as React.MutableRefObject<HTMLDivElement | null>).current =
							element;
					}
				}
			}}
		>
			<ConversationItemView
				focused={false}
				hasUnreadMessage={hasUnreadMessage}
				isTyping={isTyping}
				lastMessageCreatedAt={lastTimelineItemCreatedAt}
				lastMessageText={lastTimelineItem?.text ?? ""}
				visitorAvatarUrl={conversation.visitor?.contact?.image ?? null}
				visitorLastSeenAt={conversation.visitor?.lastSeenAt ?? null}
				visitorName={visitorName}
				waitingSinceLabel={waitingSinceLabel}
			/>
		</div>
	);
}

type TypingVisitor = {
	conversationId: string;
	visitorId: string;
};

type FakeConversationListProps = {
	conversations: ConversationHeader[];
	typingVisitors?: TypingVisitor[];
	marcConversationRef?: React.RefObject<HTMLDivElement | null>;
};

export function FakeConversationList({
	conversations,
	typingVisitors = [],
	marcConversationRef,
}: FakeConversationListProps) {
	// Sort conversations by last message received (most recent first)
	const sortedConversations = useMemo(() => {
		return [...conversations].sort((a, b) => {
			const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
			const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
			return bTime - aTime; // Most recent first
		});
	}, [conversations]);

	const MARC_CONVERSATION_ID = "01JGAA2222222222222222222";

	return (
		<PageContent className="h-full overflow-auto px-2 contain-strict">
			{sortedConversations.map((conversation) => {
				const isTyping = typingVisitors.some(
					(tv) => tv.conversationId === conversation.id
				);
				const isMarcConversation = conversation.id === MARC_CONVERSATION_ID;
				return (
					<FakeConversationListItem
						conversation={conversation}
						isTyping={isTyping}
						itemRef={isMarcConversation ? marcConversationRef : undefined}
						key={conversation.id}
					/>
				);
			})}
		</PageContent>
	);
}
