"use client";

import { useGroupedMessages } from "@cossistant/next/hooks";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "@cossistant/next/primitives";
import { SenderType } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { ConversationEvent } from "@/components/conversation/messages/event";
import { TimelineMessageGroup } from "@/components/conversation/messages/timeline-message-group";
import {
	TypingIndicator,
	type TypingParticipant,
} from "@/components/conversation/messages/typing-indicator";
import type { ConversationHeader } from "@/contexts/inboxes";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import { cn } from "@/lib/utils";
import type { FakeTypingVisitor } from "../data";

// Helper to extract event part from timeline item (same as real dashboard)
function extractEventPart(item: TimelineItem): TimelinePartEvent | null {
	if (item.type !== "event") {
		return null;
	}

	const eventPart = item.parts.find(
		(part): part is TimelinePartEvent => part.type === "event"
	);

	return eventPart || null;
}

type FakeConversationTimelineListProps = {
	items: ConversationTimelineItem[];
	visitor: ConversationHeader["visitor"];
	className?: string;
	typingVisitors: FakeTypingVisitor[];
};

const ANTHONY_RIERA_ID = "01JGUSER1111111111111111";

// Fake team member data (Anthony Riera)
const fakeTeamMembers = [
	{
		id: ANTHONY_RIERA_ID,
		name: "Anthony Riera",
		email: "the.shadcn@example.com",
		image: "https://github.com/rieranthony.png",
		lastSeenAt: new Date().toISOString(),
		role: "admin" as const,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		organizationId: "01JGORG11111111111111111",
	},
];

// Fake available human agents for event rendering
const fakeAvailableHumanAgents = [
	{
		id: ANTHONY_RIERA_ID,
		name: "Anthony Riera",
		image: "https://github.com/rieranthony.png",
		lastSeenAt: new Date().toISOString(),
	},
];

export function FakeConversationTimelineList({
	items: timelineItems,
	visitor,
	className,
	typingVisitors,
}: FakeConversationTimelineListProps) {
	const messageListRef = useRef<HTMLDivElement | null>(null);

	// Use the real useGroupedMessages hook (same as dashboard)
	const { items } = useGroupedMessages({
		items: timelineItems as unknown as TimelineItem[],
		seenData: [],
		currentViewerId: ANTHONY_RIERA_ID,
		viewerType: SenderType.TEAM_MEMBER,
	});

	// Convert fake typing visitors to typing entities (same structure as real dashboard)
	const activeTypingEntities = useMemo<TypingParticipant[]>(
		() =>
			typingVisitors
				.filter((tv) => tv.visitorId === visitor?.id)
				.map((tv) => ({
					id: tv.visitorId,
					type: "visitor" as const,
					preview: tv.preview,
				})),
		[typingVisitors, visitor?.id]
	);

	// Auto-scroll when typing indicator appears (same as real dashboard)
	useEffect(() => {
		if (!messageListRef.current || activeTypingEntities.length === 0) {
			return;
		}

		messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
	}, [activeTypingEntities]);

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"min-h-0 w-full flex-1 overflow-y-scroll pt-20 pb-48",
				"scrollbar-thin scrollbar-thumb-background-300 scrollbar-track-fd-overlay",
				className
			)}
			id="fake-conversation-timeline"
			items={timelineItems as unknown as TimelineItem[]}
			ref={messageListRef}
		>
			<div className="mx-auto pr-4 pl-6 xl:max-w-xl 2xl:max-w-2xl">
				<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
					<AnimatePresence initial={false} mode="popLayout">
						{items.map((item, index) => {
							if (item.type === "timeline_event") {
								// Extract event data from parts (same as real dashboard)
								const eventPart = extractEventPart(item.item);

								// Only render if we have valid event data
								if (!eventPart) {
									return null;
								}

								return (
									<ConversationEvent
										availableAIAgents={[]}
										availableHumanAgents={fakeAvailableHumanAgents}
										createdAt={item.item.createdAt}
										event={eventPart}
										key={item.item.id || `timeline-event-${index}`}
										visitor={visitor}
									/>
								);
							}

							if (item.type === "timeline_tool") {
								return null;
							}

							// Use first timeline item ID as stable key (same as real dashboard)
							const groupKey = item.items?.[0]?.id || `group-${index}`;

							return (
								<TimelineMessageGroup
									availableAIAgents={[]}
									currentUserId={ANTHONY_RIERA_ID}
									items={(item.items || []) as unknown as TimelineItem[]}
									key={groupKey}
									lastReadMessageIds={new Map()}
									teamMembers={fakeTeamMembers}
									visitor={visitor}
									visitorPresence={null}
								/>
							);
						})}
					</AnimatePresence>
					{/* Typing indicator (same as real dashboard) */}
					{activeTypingEntities.length > 0 && (
						<TypingIndicator
							activeTypingEntities={activeTypingEntities}
							availableAIAgents={[]}
							availableHumanAgents={fakeAvailableHumanAgents}
							className="mt-2"
							visitor={visitor}
							visitorPresence={null}
						/>
					)}
				</ConversationTimelineContainer>
			</div>
		</PrimitiveConversationTimeline>
	);
}
