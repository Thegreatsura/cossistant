"use client";

import type { RouterOutputs } from "@api/trpc/types";
import { useConversationTyping } from "@cossistant/react/hooks/use-conversation-typing";
import { ConversationStatus } from "@cossistant/types";
import { useQueryNormalizer } from "@normy/react-query";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useVisitorPresenceById } from "@/contexts/visitor-presence";
import { useUserSession } from "@/contexts/website";
import { useLatestConversationMessage } from "@/data/use-latest-conversation-message";
import { usePrefetchConversationData } from "@/data/use-prefetch-conversation-data";
import { isInboundVisitorMessage } from "@/lib/conversation-messages";
import { formatTimeAgo, getWaitingSinceLabel } from "@/lib/date";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import { ConversationBasicActions } from "../conversation/actions/basic";
import { BouncingDots } from "../conversation/messages/typing-indicator";

type Props = {
	href: string;
	header: ConversationHeader;
	websiteSlug: string;
	focused?: boolean;
	setFocused?: () => void;
	showWaitingForReplyPill?: boolean;
};

export function ConversationItem({
	href,
	header,
	websiteSlug,
	focused = false,
	setFocused,
	showWaitingForReplyPill = false,
}: Props) {
	const queryNormalizer = useQueryNormalizer();
	const { visitor: headerVisitor, lastTimelineItem: headerLastTimelineItem } =
		header;
	const { prefetchConversation } = usePrefetchConversationData();
	const { user } = useUserSession();
	const trpc = useTRPC();
	const presence = useVisitorPresenceById(header.visitorId);

	const visitorQueryOptions = useMemo(
		() =>
			trpc.conversation.getVisitorById.queryOptions({
				websiteSlug,
				visitorId: header.visitorId,
			}),
		[header.visitorId, trpc, websiteSlug]
	);

	const visitorPlaceholder = useMemo<
		RouterOutputs["conversation"]["getVisitorById"] | undefined
	>(() => {
		if (!header.visitorId) {
			return;
		}

		return queryNormalizer.getObjectById<
			RouterOutputs["conversation"]["getVisitorById"]
		>(header.visitorId);
	}, [header.visitorId, queryNormalizer]);

	const visitorQuery = useQuery({
		...visitorQueryOptions,
		enabled: Boolean(header.visitorId),
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		placeholderData: visitorPlaceholder,
	});

	const visitor = useMemo(() => {
		const normalizedVisitor = visitorQuery.data ?? null;

		// Prefer normalized visitor data when available as it's more complete
		return normalizedVisitor ?? headerVisitor;
	}, [headerVisitor, visitorQuery.data]);

	const typingEntries = useConversationTyping(header.id, {
		excludeUserId: user.id,
	});

	const typingInfo = useMemo(() => {
		if (typingEntries.length === 0 || !visitor) {
			return null;
		}

		const entry = typingEntries[0];

		if (entry?.actorType === "visitor") {
			return {
				name: visitor.contact?.name || visitor.contact?.email || "Visitor",
				hasPreview: !!entry.preview,
			};
		}

		return null;
	}, [typingEntries, visitor]);

	const cachedLastTimelineItem = useLatestConversationMessage({
		conversationId: header.id,
		websiteSlug,
	});

	const lastTimelineItem =
		cachedLastTimelineItem ?? headerLastTimelineItem ?? null;

	const lastTimelineItemCreatedAt = lastTimelineItem?.createdAt
		? new Date(lastTimelineItem.createdAt)
		: null;
	const shouldDisplayWaitingPill =
		showWaitingForReplyPill &&
		header.status === ConversationStatus.OPEN &&
		!header.deletedAt;

	const inboundWaitingTimelineItem = useMemo(() => {
		if (!shouldDisplayWaitingPill) {
			return null;
		}

		return isInboundVisitorMessage(lastTimelineItem) ? lastTimelineItem : null;
	}, [lastTimelineItem, shouldDisplayWaitingPill]);

	const waitingSinceLabel = useMemo(() => {
		if (!inboundWaitingTimelineItem) {
			return null;
		}

		return getWaitingSinceLabel(new Date(inboundWaitingTimelineItem.createdAt));
	}, [inboundWaitingTimelineItem?.createdAt]);

	const headerLastSeenAt = header.lastSeenAt
		? new Date(header.lastSeenAt)
		: null;

	const isLastTimelineItemFromCurrentUser =
		lastTimelineItem?.userId === user.id;

	const hasUnreadMessage = Boolean(
		lastTimelineItem &&
			!isLastTimelineItemFromCurrentUser &&
			lastTimelineItemCreatedAt &&
			(!headerLastSeenAt || lastTimelineItemCreatedAt > headerLastSeenAt)
	);

	const fullName = getVisitorNameWithFallback(visitor ?? headerVisitor);

	return (
		<Link
			className={cn(
				"group/conversation-item relative flex items-center gap-3 rounded-lg px-2 py-2 text-sm",
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
				className="size-8"
				fallbackName={fullName}
				lastOnlineAt={
					presence?.lastSeenAt ??
					visitor?.lastSeenAt ??
					headerVisitor?.lastSeenAt ??
					null
				}
				status={presence?.status}
				url={visitor?.contact?.image ?? headerVisitor?.contact?.image}
				withBoringAvatar
			/>

			<div className="flex min-w-0 flex-1 items-center gap-1 md:gap-4">
				<p className="min-w-[120px] max-w-[120px] truncate">{fullName}</p>

				{typingInfo ? (
					<BouncingDots />
				) : (
					<p className={cn("truncate pr-6 text-muted-foreground")}>
						{lastTimelineItem?.text ?? ""}
					</p>
				)}
			</div>
			<div className="flex items-center gap-1">
				{focused ? (
					<ConversationBasicActions
						conversationId={header.id}
						deletedAt={header.deletedAt}
						enableKeyboardShortcuts
						status={header.status}
						visitorId={header.visitorId}
					/>
				) : waitingSinceLabel ? (
					<span className="shrink-0 rounded-full bg-cossistant-orange/10 px-2 py-0.5 font-medium text-[11px] text-cossistant-orange uppercase leading-none">
						Waiting {waitingSinceLabel}
					</span>
				) : lastTimelineItemCreatedAt ? (
					<span className="shrink-0 pr-2 text-primary/40 text-xs">
						{formatTimeAgo(lastTimelineItemCreatedAt)}
					</span>
				) : null}
				<span
					aria-hidden="true"
					className={cn(
						"inline-block size-1.5 rounded-full bg-cossistant-orange opacity-0",
						hasUnreadMessage && "opacity-100"
					)}
				/>
			</div>
		</Link>
	);
}
