import type { RouterOutputs } from "@api/trpc/types";
import { useGroupedMessages } from "@cossistant/next/hooks";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "@cossistant/next/primitives";
import { useConversationTyping } from "@cossistant/react/hooks/use-conversation-typing";

import type { AvailableAIAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { AnimatePresence } from "motion/react";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { cn } from "@/lib/utils";
import { ConversationEvent } from "./event";
import { TimelineMessageGroup } from "./timeline-message-group";
import { TypingIndicator, type TypingParticipant } from "./typing-indicator";

// Helper to extract event part from timeline item
function extractEventPart(item: TimelineItem): TimelinePartEvent | null {
	if (item.type !== "event") {
		return null;
	}

	const eventPart = item.parts.find(
		(part): part is TimelinePartEvent => part.type === "event"
	);

	return eventPart || null;
}

type ConversationTimelineListProps = {
	ref?: React.RefObject<HTMLDivElement | null>;
	items: TimelineItem[];
	teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
	availableAIAgents: AvailableAIAgent[];
	seenData?: ConversationSeen[];
	visitor: ConversationHeader["visitor"];
	currentUserId: string;
	conversationId: string;
	className?: string;
	onFetchMoreIfNeeded?: () => void;
};

export function ConversationTimelineList({
	ref,
	items: timelineItems,
	teamMembers = [],
	availableAIAgents = [],
	seenData = [],
	currentUserId,
	conversationId,
	className,
	onFetchMoreIfNeeded,
	visitor,
}: ConversationTimelineListProps) {
	const fallbackRef = useRef<HTMLDivElement | null>(null);
	const messageListRef =
		(ref as RefObject<HTMLDivElement | null> | undefined) ?? fallbackRef;

	const {
		items,
		lastReadMessageMap,
		getLastReadMessageId,
		isMessageSeenByViewer,
	} = useGroupedMessages({
		items: timelineItems,
		seenData,
		currentViewerId: currentUserId,
		viewerType: SenderType.TEAM_MEMBER,
	});

	const typingEntries = useConversationTyping(conversationId, {
		excludeUserId: currentUserId,
	});

	const availableHumanAgents = useMemo(
		() =>
			teamMembers.map((member) => ({
				id: member.id,
				name: member.name ?? member.email?.split("@")[0] ?? "Unknown member",
				image: member.image,
				lastSeenAt: member.lastSeenAt,
			})),
		[teamMembers]
	);

	const activeTypingEntities = useMemo(
		() =>
			typingEntries
				.map((entry): TypingParticipant | null => {
					if (entry.actorType === "visitor") {
						return {
							id: entry.actorId,
							type: "visitor" as const,
							preview: entry.preview,
						};
					}

					if (entry.actorType === "ai_agent") {
						return {
							id: entry.actorId,
							type: "ai" as const,
							preview: entry.preview,
						};
					}

					return null;
				})
				.filter(
					(participant): participant is TypingParticipant =>
						participant !== null
				),
		[typingEntries]
	);

	useEffect(() => {
		if (!messageListRef.current || activeTypingEntities.length === 0) {
			return;
		}

		messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
	}, [activeTypingEntities, messageListRef]);

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"overflow-y-auto pt-20 pr-4 pb-48 pl-4",
				"scrollbar-thin scrollbar-thumb-background-300 scrollbar-track-transparent",
				"h-full w-full",
				className
			)}
			id="conversation-timeline"
			items={timelineItems}
			onScrollStart={onFetchMoreIfNeeded}
			ref={ref ?? messageListRef}
		>
			<div className="mx-auto xl:max-w-xl 2xl:max-w-2xl">
				<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
					<AnimatePresence initial={false} mode="popLayout">
						{items.map((item, index) => {
							if (item.type === "timeline_event") {
								// Extract event data from parts
								const eventPart = extractEventPart(item.item);

								// Only render if we have valid event data
								if (!eventPart) {
									return null;
								}

								return (
									<ConversationEvent
										availableAIAgents={availableAIAgents}
										availableHumanAgents={availableHumanAgents}
										createdAt={item.item.createdAt}
										event={eventPart}
										key={item.item.id || `timeline-event-${index}`}
									/>
								);
							}

							// Use first timeline item ID as stable key
							const groupKey = item.items?.[0]?.id || `group-${index}`;

							return (
								<TimelineMessageGroup
									availableAIAgents={availableAIAgents}
									currentUserId={currentUserId}
									items={item.items || []}
									key={groupKey}
									lastReadMessageIds={lastReadMessageMap}
									teamMembers={teamMembers}
									visitor={visitor}
								/>
							);
						})}
					</AnimatePresence>
					{activeTypingEntities.length > 0 && (
						<TypingIndicator
							activeTypingEntities={activeTypingEntities}
							availableAIAgents={availableAIAgents}
							availableHumanAgents={availableHumanAgents}
							className="mt-2"
							visitor={visitor}
						/>
					)}
				</ConversationTimelineContainer>
			</div>
		</PrimitiveConversationTimeline>
	);
}
