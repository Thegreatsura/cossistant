import {
  type AvailableAIAgent,
  type AvailableHumanAgent,
  type ConversationEvent,
  type Message as MessageType,
  SenderType,
} from "@cossistant/types";
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
import {
  TypingIndicator,
  type TypingParticipant,
} from "../../primitives/typing-indicator";
import { cn } from "../utils";
import { ConversationEvent as ConversationEventComponent } from "./conversation-event";
import { MessageGroup } from "./message-group";

export type MessageListProps = {
  conversationId: string;
  messages: MessageType[];
  events: ConversationEvent[];
  className?: string;
  availableAIAgents: AvailableAIAgent[];
  availableHumanAgents: AvailableHumanAgent[];
  currentVisitorId?: string;
};

export const MessageList: React.FC<MessageListProps> = ({
  conversationId,
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
    messages,
    events,
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
          const human = availableHumanAgents.find(
            (agent) => agent.id === entry.actorId
          );

          return human
            ? {
                id: entry.actorId,
                name: human.name || "Support",
                type: "team_member" as const,
                avatarUrl: human.image || null,
              }
            : {
                id: entry.actorId,
                name: "Support",
                type: "team_member" as const,
                avatarUrl: null,
              };
        }

        if (entry.actorType === "ai_agent") {
          const ai = availableAIAgents.find(
            (agent) => agent.id === entry.actorId
          );

          return ai
            ? {
                id: entry.actorId,
                name: ai.name || "AI assistant",
                type: "ai" as const,
                avatarUrl: ai.image || null,
              }
            : {
                id: entry.actorId,
                name: "AI assistant",
                type: "ai" as const,
                avatarUrl: null,
              };
        }

        return null;
      })
      .filter(
        (participant): participant is TypingParticipant => participant !== null
      );
  }, [typingEntries, availableHumanAgents, availableAIAgents]);

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

            // Only show seen indicator on the LAST message group sent by the visitor
            const isLastVisitorGroup = index === lastVisitorMessageGroupIndex;
            const seenByIds =
              isLastVisitorGroup && item.lastMessageId
                ? getMessageSeenBy(item.lastMessageId)
                : [];

            // Use first message ID as stable key
            const groupKey = item.messages[0]?.id || `group-${index}`;

            return (
              <MessageGroup
                availableAIAgents={availableAIAgents}
                availableHumanAgents={availableHumanAgents}
                currentVisitorId={currentVisitorId}
                key={groupKey}
                messages={item.messages}
                seenByIds={seenByIds}
              />
            );
          })}
        </AnimatePresence>
        {typingParticipants.length > 0 ? (
          <TypingIndicator className="mt-2" participants={typingParticipants} />
        ) : null}
      </MessageListContainer>
    </PrimitiveMessageList>
  );
};
