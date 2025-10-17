import {
	type AvailableAIAgent,
	type AvailableHumanAgent,
	type ConversationEvent,
	type Message as MessageType,
	SenderType,
} from "@cossistant/types";
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
	MessageListContainer,
	MessageList as PrimitiveMessageList,
} from "../../primitives/message-list";
import { cn } from "../utils";
import { ConversationEvent as ConversationEventComponent } from "./conversation-event";
import { MessageGroup } from "./message-group";
import { TypingIndicator, type TypingParticipant } from "./typing-indicator";

export type MessageListProps = {
	conversationId: string;
	items?: TimelineItem[];
	messages?: MessageType[]; // Legacy support
	events?: ConversationEvent[]; // Legacy support
	className?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	currentVisitorId?: string;
};

export const MessageList: React.FC<MessageListProps> = ({
	conversationId,
	items: timelineItems,
	messages,
	events = [],
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
		messages: timelineItems ? undefined : messages,
		events: timelineItems ? undefined : events,
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
				const firstMessage = item.messages[0];
				if (firstMessage?.visitorId === currentVisitorId) {
					return i;
				}
			}
		}
		return -1;
	}, [items, currentVisitorId]);

	const typingParticipants = useMemo(() => {
		return typingEntries
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
				(participant): participant is TypingParticipant => participant !== null
			);
	}, [typingEntries]);

	return (
		<PrimitiveMessageList
			autoScroll={true}
			className={cn(
				"overflow-y-auto scroll-smooth px-3 py-6",
				"scrollbar-thin scrollbar-thumb-co-background-300 scrollbar-track-transparent",
				"h-full w-full",
				className
			)}
			events={events}
			id="message-list"
			messages={messages}
		>
			<MessageListContainer className="flex min-h-full w-full flex-col gap-3">
				<AnimatePresence initial={false} mode="popLayout">
					{items.map((item, index) => {
						if (item.type === "event") {
							return (
								<ConversationEventComponent
									availableAIAgents={availableAIAgents}
									availableHumanAgents={availableHumanAgents}
									event={item.event}
									key={item.event.id}
								/>
							);
						}

						if (item.type === "timeline_event") {
							// For now, render timeline events as regular events
							// In the future, we can create a dedicated component
							return (
								<ConversationEventComponent
									availableAIAgents={availableAIAgents}
									availableHumanAgents={availableHumanAgents}
									event={item.item as unknown as ConversationEvent}
									key={item.item.id || `timeline-event-${index}`}
								/>
							);
						}

						// Only show seen indicator on the LAST message group sent by the visitor
						const isLastVisitorGroup = index === lastVisitorMessageGroupIndex;
						const seenByIds =
							isLastVisitorGroup && item.lastMessageId
								? getMessageSeenBy(item.lastMessageId)
								: [];

						// Use first message/item ID as stable key
						const groupKey =
							item.messages[0]?.id || item.items?.[0]?.id || `group-${index}`;

						return (
							<MessageGroup
								availableAIAgents={availableAIAgents}
								availableHumanAgents={availableHumanAgents}
								currentVisitorId={currentVisitorId}
								items={item.items}
								key={groupKey}
								messages={item.messages}
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
			</MessageListContainer>
		</PrimitiveMessageList>
	);
};
