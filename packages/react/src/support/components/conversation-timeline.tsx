import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { AnimatePresence } from "motion/react";
import type React from "react";
import { useMemo } from "react";
import {
	useConversationTyping,
	useDebouncedConversationSeen,
} from "../../hooks";
import { useGroupedMessages } from "../../hooks/private/use-grouped-messages";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "../../primitives/conversation-timeline";
import { cn } from "../utils";
import { ConversationEvent as ConversationEventComponent } from "./conversation-event";
import { TimelineMessageGroup } from "./timeline-message-group";
import { TypingIndicator, type TypingParticipant } from "./typing-indicator";

export type ConversationTimelineProps = {
	conversationId: string;
	items: TimelineItem[];
	className?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	currentVisitorId?: string;
};

export const ConversationTimelineList: React.FC<ConversationTimelineProps> = ({
	conversationId,
	items: timelineItems,
	className,
	availableAIAgents = [],
	availableHumanAgents = [],
	currentVisitorId,
}) => {
	const seenData = useDebouncedConversationSeen(conversationId);
	const typingEntries = useConversationTyping(conversationId, {
		excludeVisitorId: currentVisitorId ?? null,
	});

	const { items, getMessageSeenBy } = useGroupedMessages({
		items: timelineItems,
		seenData,
		currentViewerId: currentVisitorId,
		viewerType: SenderType.VISITOR,
	});

	// Find the last message group sent by the current visitor
	const lastVisitorMessageGroupIndex = useMemo(() => {
		for (let i = items.length - 1; i >= 0; i--) {
			const item = items[i];
			if (!item) {
				continue;
			}
			if (item.type === "message_group") {
				const firstItem = item.items?.[0];
				if (firstItem?.visitorId === currentVisitorId) {
					return i;
				}
			}
		}
		return -1;
	}, [items, currentVisitorId]);

	const typingParticipants = useMemo(
		() =>
			typingEntries
				.map((entry): TypingParticipant | null => {
					if (entry.actorType === "user") {
						return {
							id: entry.actorId,
							type: "team_member" as const,
						};
					}

					if (entry.actorType === "ai_agent") {
						return {
							id: entry.actorId,
							type: "ai" as const,
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

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"overflow-y-auto scroll-smooth px-3 py-6",
				"scrollbar-thin scrollbar-thumb-co-background-300 scrollbar-track-transparent",
				"h-full w-full",
				className
			)}
			id="conversation-timeline"
			items={timelineItems}
		>
			<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
				<AnimatePresence initial={false} mode="popLayout">
					{items.map((item, index) => {
						if (item.type === "timeline_event") {
							// Render timeline event items
							// Timeline events with type=EVENT should have event parts
							// For now we skip rendering them, but could extract event data from parts
							return null;
						}

						// Only show seen indicator on the LAST message group sent by the visitor
						const isLastVisitorGroup = index === lastVisitorMessageGroupIndex;
						const seenByIds =
							isLastVisitorGroup && item.lastMessageId
								? getMessageSeenBy(item.lastMessageId)
								: [];

						// Use first timeline item ID as stable key
						const groupKey = item.items?.[0]?.id || `group-${index}`;

						return (
							<TimelineMessageGroup
								availableAIAgents={availableAIAgents}
								availableHumanAgents={availableHumanAgents}
								currentVisitorId={currentVisitorId}
								items={item.items || []}
								key={groupKey}
								seenByIds={seenByIds}
							/>
						);
					})}
				</AnimatePresence>
				<div className="h-6 w-full">
					{typingParticipants.length > 0 ? (
						<TypingIndicator
							availableAIAgents={availableAIAgents}
							availableHumanAgents={availableHumanAgents}
							className="mt-2"
							participants={typingParticipants}
						/>
					) : null}
				</div>
			</ConversationTimelineContainer>
		</PrimitiveConversationTimeline>
	);
};
