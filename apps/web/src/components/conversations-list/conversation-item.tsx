"use client";

import type { RouterOutputs } from "@api/trpc/types";
import { useConversationTyping } from "@cossistant/react/hooks/use-conversation-typing";
import { ConversationStatus } from "@cossistant/types";
import { useQueryNormalizer } from "@normy/react-query";
import { useQuery } from "@tanstack/react-query";
import { differenceInHours } from "date-fns";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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

type ConversationItemViewProps = {
	visitorName: string;
	visitorAvatarUrl?: string | null;
	visitorPresenceStatus?: "online" | "away";
	visitorLastSeenAt?: string | null;
	lastMessageText: string;
	lastMessageCreatedAt?: Date | null;
	isTyping: boolean;
	waitingSinceLabel?: string | null;
	hasUnreadMessage: boolean;
	focused?: boolean;
	rightContent?: ReactNode;
	className?: string;
	onMouseEnter?: () => void;
	href?: string;
};

export function ConversationItemView({
	visitorName,
	visitorAvatarUrl,
	visitorPresenceStatus,
	visitorLastSeenAt,
	lastMessageText,
	lastMessageCreatedAt,
	isTyping,
	waitingSinceLabel,
	hasUnreadMessage,
	focused = false,
	rightContent,
	className,
	onMouseEnter,
	href,
}: ConversationItemViewProps) {
	const [isMounted, setIsMounted] = useState(false);
	const [formattedTime, setFormattedTime] = useState<string | null>(null);

	useEffect(() => {
		setIsMounted(true);
		if (lastMessageCreatedAt) {
			setFormattedTime(formatTimeAgo(lastMessageCreatedAt));
		}
	}, [lastMessageCreatedAt]);

	const content = (
		<>
			<Avatar
				className="size-8"
				fallbackName={visitorName}
				lastOnlineAt={visitorLastSeenAt}
				status={visitorPresenceStatus}
				url={visitorAvatarUrl}
				withBoringAvatar
			/>

			<div className="flex min-w-0 flex-1 items-center gap-1 md:gap-4">
				<p className="min-w-[120px] max-w-[120px] truncate">{visitorName}</p>

				{isTyping ? (
					<BouncingDots />
				) : (
					<p className={cn("truncate pr-6 text-muted-foreground")}>
						{lastMessageText}
					</p>
				)}
			</div>
			<div className="flex items-center gap-3">
				{waitingSinceLabel && (
					<span className="shrink-0 rounded border border-cossistant-orange/10 bg-cossistant-orange/5 px-2 py-1 font-medium text-[11px] text-cossistant-orange leading-none">
						Waiting for {waitingSinceLabel}
					</span>
				)}
				<div className="flex min-w-[70px] items-center justify-end gap-1">
					{rightContent ||
						(isMounted && formattedTime ? (
							<span className="shrink-0 pr-2 text-primary/40 text-xs">
								{formattedTime}
							</span>
						) : null)}
					<span
						aria-hidden="true"
						className={cn(
							"inline-block size-1.5 rounded-full bg-cossistant-orange opacity-0",
							hasUnreadMessage && "opacity-100"
						)}
					/>
				</div>
			</div>
		</>
	);

	const baseClasses = cn(
		"group/conversation-item relative flex items-center gap-3 rounded-lg px-2 py-2 text-sm",
		"focus-visible:outline-none focus-visible:ring-0",
		focused && "bg-background-200 text-primary dark:bg-background-300",
		className
	);

	if (href) {
		return (
			<Link
				className={baseClasses}
				href={href}
				onMouseEnter={onMouseEnter}
				prefetch="auto"
			>
				{content}
			</Link>
		);
	}

	if (onMouseEnter) {
		return (
			<button className={baseClasses} onMouseEnter={onMouseEnter} type="button">
				{content}
			</button>
		);
	}

	return <div className={baseClasses}>{content}</div>;
}

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

		const messageDate = new Date(inboundWaitingTimelineItem.createdAt);
		const now = new Date();
		const hoursAgo = differenceInHours(now, messageDate);

		// Only show waiting label if message is older than 8 hours
		if (hoursAgo < 8) {
			return null;
		}

		return getWaitingSinceLabel(messageDate);
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
		<ConversationItemView
			focused={focused}
			hasUnreadMessage={hasUnreadMessage}
			href={href}
			isTyping={Boolean(typingInfo)}
			lastMessageCreatedAt={lastTimelineItemCreatedAt}
			lastMessageText={lastTimelineItem?.text ?? ""}
			onMouseEnter={() => {
				setFocused?.();
				prefetchConversation({
					websiteSlug,
					conversationId: header.id,
					visitorId: header.visitorId,
				});
			}}
			rightContent={
				focused ? (
					<ConversationBasicActions
						conversationId={header.id}
						deletedAt={header.deletedAt}
						enableKeyboardShortcuts
						status={header.status}
						visitorId={header.visitorId}
					/>
				) : null
			}
			visitorAvatarUrl={
				visitor?.contact?.image ?? headerVisitor?.contact?.image ?? null
			}
			visitorLastSeenAt={
				presence?.lastSeenAt ??
				visitor?.lastSeenAt ??
				headerVisitor?.lastSeenAt ??
				null
			}
			visitorName={fullName}
			visitorPresenceStatus={presence?.status}
			waitingSinceLabel={waitingSinceLabel}
		/>
	);
}
