import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useConversationTimeline } from "../../hooks/use-conversation-timeline";
import { useTypingSound } from "../../hooks/use-typing-sound";
import {
	ConversationTimelineContainer,
	ConversationTimeline as PrimitiveConversationTimeline,
} from "../../primitives/conversation-timeline";
import { cn } from "../utils";
import { ConversationEvent } from "./conversation-event";
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

const EMPTY_SEEN_BY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_SEEN_BY_NAMES: readonly string[] = Object.freeze([]);

export type ConversationTimelineToolProps = {
	item: TimelineItem;
	conversationId: string;
};

export type ConversationTimelineToolDefinition = {
	component: React.ComponentType<ConversationTimelineToolProps>;
};

export type ConversationTimelineTools = Record<
	string,
	ConversationTimelineToolDefinition
>;

export type ConversationTimelineProps = {
	conversationId: string;
	items: TimelineItem[];
	className?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	currentVisitorId?: string;
	tools?: ConversationTimelineTools;
};

export const ConversationTimelineList: React.FC<ConversationTimelineProps> = ({
	conversationId,
	items: timelineItems,
	className,
	availableAIAgents = [],
	availableHumanAgents = [],
	currentVisitorId,
	tools,
}) => {
	const timeline = useConversationTimeline({
		conversationId,
		items: timelineItems,
		currentVisitorId,
	});

	const typingIndicatorParticipants = useMemo(
		() =>
			timeline.typingParticipants.map<TypingParticipant>((participant) => ({
				id: participant.id,
				type: participant.type,
			})),
		[timeline.typingParticipants]
	);

	// Play typing sound when someone is typing
	useTypingSound(typingIndicatorParticipants.length > 0, {
		volume: 1,
		playbackRate: 1.3,
	});

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

	return (
		<PrimitiveConversationTimeline
			autoScroll={true}
			className={cn(
				"overflow-y-scroll scroll-smooth px-3 py-6",
				"co-scrollbar-thin",
				"h-full w-full",
				className
			)}
			id="conversation-timeline"
			items={timelineItems}
		>
			<ConversationTimelineContainer className="flex min-h-full w-full flex-col gap-3">
				{timeline.groupedMessages.items.map((item, index) => {
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
						const toolName = item.tool ?? item.item.tool ?? item.item.type;
						const toolDefinition = toolName ? tools?.[toolName] : undefined;

						if (!toolDefinition) {
							return null;
						}

						const ToolComponent = toolDefinition.component;

						const toolKey =
							item.item.id ?? `${toolName}-${item.item.createdAt}-${index}`;

						return (
							<ToolComponent
								conversationId={conversationId}
								item={item.item}
								key={toolKey}
							/>
						);
					}

					// Only show seen indicator on the LAST message group sent by the visitor
					const isLastVisitorGroup =
						index === timeline.lastVisitorMessageGroupIndex;
					const seenByIds =
						isLastVisitorGroup && item.lastMessageId
							? timeline.groupedMessages.getMessageSeenBy(item.lastMessageId)
							: EMPTY_SEEN_BY_IDS;
					const seenByNames =
						seenByIds.length > 0
							? getSeenByNames(seenByIds)
							: EMPTY_SEEN_BY_NAMES;

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
};
