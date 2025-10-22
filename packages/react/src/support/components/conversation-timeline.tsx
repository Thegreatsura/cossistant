import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import { AnimatePresence } from "motion/react";
import type React from "react";
import { useConversationTimeline } from "../../hooks/use-conversation-timeline";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "../../primitives/conversation-timeline";
import { cn } from "../utils";
import { ConversationEvent as ConversationEventComponent } from "./conversation-event";
import { TimelineMessageGroup } from "./timeline-message-group";
import { TypingIndicator, type TypingParticipant } from "./typing-indicator";

// Helper to extract event part from timeline item
function extractEventPart(item: TimelineItem): TimelinePartEvent | null {
	if (item.type !== "event") {
		return null;
	}

	const eventPart = item.parts.find(
		(part): part is TimelinePartEvent => part.type === "event",
	);

	return eventPart || null;
}

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
	const timeline = useConversationTimeline({
		conversationId,
		items: timelineItems,
		currentVisitorId,
	});

	const typingIndicatorParticipants =
		timeline.typingParticipants.map<TypingParticipant>(
			(participant) => ({
				id: participant.id,
				type: participant.type,
			}),
		);

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"overflow-y-auto scroll-smooth px-3 py-6",
				"scrollbar-thin scrollbar-thumb-co-background-300 scrollbar-track-transparent",
				"h-full w-full",
				className,
			)}
			id="conversation-timeline"
			items={timelineItems}
		>
			<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
				<AnimatePresence
					initial={false}
					mode="popLayout"
				>
					{timeline.groupedMessages.items.map(
						(item, index) => {
							if (
								item.type ===
								"timeline_event"
							) {
								// Extract event data from parts
								const eventPart =
									extractEventPart(
										item.item,
									);

								// Only render if we have valid event data
								if (
									!eventPart
								) {
									return null;
								}

								return (
									<ConversationEventComponent
										availableAIAgents={
											availableAIAgents
										}
										availableHumanAgents={
											availableHumanAgents
										}
										createdAt={
											item
												.item
												.createdAt
										}
										event={
											eventPart
										}
										key={
											item
												.item
												.id ||
											`timeline-event-${index}`
										}
									/>
								);
							}

							// Only show seen indicator on the LAST message group sent by the visitor
							const isLastVisitorGroup =
								index ===
								timeline.lastVisitorMessageGroupIndex;
							const seenByIds =
								isLastVisitorGroup &&
								item.lastMessageId
									? timeline.groupedMessages.getMessageSeenBy(
											item.lastMessageId,
										)
									: [];

							// Use first timeline item ID as stable key
							const groupKey =
								item.items?.[0]
									?.id ||
								`group-${index}`;

							return (
								<TimelineMessageGroup
									availableAIAgents={
										availableAIAgents
									}
									availableHumanAgents={
										availableHumanAgents
									}
									currentVisitorId={
										currentVisitorId
									}
									items={
										item.items ||
										[]
									}
									key={
										groupKey
									}
									seenByIds={
										seenByIds
									}
								/>
							);
						},
					)}
				</AnimatePresence>
				<div className="h-6 w-full">
					{typingIndicatorParticipants.length >
					0 ? (
						<TypingIndicator
							availableAIAgents={
								availableAIAgents
							}
							availableHumanAgents={
								availableHumanAgents
							}
							className="mt-2"
							participants={
								typingIndicatorParticipants
							}
						/>
					) : null}
				</div>
			</ConversationTimelineContainer>
		</PrimitiveConversationTimeline>
	);
};
