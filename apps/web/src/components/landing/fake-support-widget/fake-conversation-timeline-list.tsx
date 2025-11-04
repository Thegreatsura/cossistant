"use client";

import { useGroupedMessages } from "@cossistant/react/hooks";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "@cossistant/react/primitives";
import { ConversationEvent } from "@cossistant/react/support/components/conversation-event";
import { TimelineMessageGroup } from "@cossistant/react/support/components/timeline-message-group";
import {
	TypingIndicator,
	type TypingParticipant,
} from "@cossistant/react/support/components/typing-indicator";
import { cn } from "@cossistant/react/support/utils";
import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FakeTypingVisitor } from "../fake-dashboard/data";

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

const EMPTY_SEEN_BY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_SEEN_BY_NAMES: readonly string[] = Object.freeze([]);

type FakeConversationTimelineListProps = {
	conversationId: string;
	items: TimelineItem[];
	className?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	currentVisitorId?: string;
	typingVisitors: FakeTypingVisitor[];
};

/**
 * Custom timeline list for the fake support widget that accepts
 * typing data as props instead of relying on the typing store.
 */
export function FakeConversationTimelineList({
	conversationId,
	items: timelineItems,
	className,
	availableAIAgents = [],
	availableHumanAgents = [],
	currentVisitorId,
	typingVisitors,
}: FakeConversationTimelineListProps) {
	const messageListRef = useRef<HTMLDivElement | null>(null);

	// Use the real useGroupedMessages hook
	const { items: groupedMessages } = useGroupedMessages({
		items: timelineItems,
		seenData: [],
		currentViewerId: currentVisitorId,
		viewerType: SenderType.VISITOR,
	});

	// Convert fake typing visitors to typing participants
	// Filter out the current visitor's own typing indicator
	const typingIndicatorParticipants = useMemo<TypingParticipant[]>(
		() =>
			typingVisitors
				.filter((tv) => tv.visitorId !== currentVisitorId)
				.map((tv) => ({
					id: tv.visitorId,
					type: "team_member" as const,
				})),
		[typingVisitors, currentVisitorId]
	);

	const seenNameLookup = useMemo(() => {
		const map = new Map<string, string>();

		for (const agent of availableHumanAgents) {
			if (agent.name) {
				map.set(agent.id, agent.name);
			}
		}

		for (const agent of availableAIAgents) {
			if (agent.name) {
				map.set(agent.id, agent.name);
			}
		}

		return map;
	}, [availableHumanAgents, availableAIAgents]);

	const getSeenByNames = useCallback(
		(ids: readonly string[] = EMPTY_SEEN_BY_IDS): readonly string[] => {
			if (ids.length === 0 || seenNameLookup.size === 0) {
				return EMPTY_SEEN_BY_NAMES;
			}

			const uniqueNames = new Set<string>();
			const names: string[] = [];

			for (const id of ids) {
				const name = seenNameLookup.get(id);
				if (!name || uniqueNames.has(name)) {
					continue;
				}

				uniqueNames.add(name);
				names.push(name);
			}

			if (names.length === 0) {
				return EMPTY_SEEN_BY_NAMES;
			}

			return Object.freeze(names);
		},
		[seenNameLookup]
	);

	// Find last visitor message group index
	const lastVisitorMessageGroupIndex = useMemo(() => {
		for (let index = groupedMessages.length - 1; index >= 0; index--) {
			const item = groupedMessages[index];

			if (!item || item.type !== "message_group") {
				continue;
			}

			const firstMessage = item.items?.[0];
			if (firstMessage?.visitorId === currentVisitorId) {
				return index;
			}
		}

		return -1;
	}, [groupedMessages, currentVisitorId]);

	// Auto-scroll when typing indicator appears
	useEffect(() => {
		if (!messageListRef.current || typingIndicatorParticipants.length === 0) {
			return;
		}

		messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
	}, [typingIndicatorParticipants.length]);

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"overflow-y-auto overflow-x-hidden scroll-smooth px-3 py-6",
				"scrollbar-thin scrollbar-thumb-co-background-300 scrollbar-track-fd-overlay",
				"h-full w-full",
				className
			)}
			id="fake-conversation-timeline"
			items={timelineItems}
			ref={messageListRef}
			style={{ scrollbarGutter: "stable" }}
		>
			<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
				{groupedMessages.map((item, index) => {
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
                                                                key={item.item.id ?? `timeline-event-${item.item.createdAt}`}
                                                        />
                                                );
                                        }

                                        if (item.type === "timeline_tool") {
                                                return null;
                                        }

                                        // Only show seen indicator on the LAST message group sent by the visitor
                                        const isLastVisitorGroup = index === lastVisitorMessageGroupIndex;
					const seenByIds = EMPTY_SEEN_BY_IDS; // No seen data for fake widget
					const seenByNames = EMPTY_SEEN_BY_NAMES;

					// Use first timeline item ID as stable key
					const groupKey =
						item.lastMessageId ??
						item.items?.[0]?.id ??
						`group-${item.items?.[0]?.createdAt ?? index}`;

					return (
						<TimelineMessageGroup
							availableAIAgents={availableAIAgents}
							availableHumanAgents={availableHumanAgents}
							currentVisitorId={currentVisitorId}
							items={item.items || []}
							key={groupKey}
							seenByIds={seenByIds}
							seenByNames={seenByNames}
						/>
					);
				})}
				<div className="h-6 w-full">
					{typingIndicatorParticipants.length > 0 ? (
						<TypingIndicator
							availableAIAgents={availableAIAgents}
							availableHumanAgents={availableHumanAgents}
							className="mt-2"
							participants={typingIndicatorParticipants}
						/>
					) : null}
				</div>
			</ConversationTimelineContainer>
		</PrimitiveConversationTimeline>
	);
}
