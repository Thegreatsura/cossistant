import type { RouterOutputs } from "@api/trpc/types";
import { useGroupedMessages } from "@cossistant/next/hooks";
import {
  MessageListContainer,
  MessageList as PrimitiveMessageList,
} from "@cossistant/next/primitives";
import { useConversationTyping } from "@cossistant/react/hooks/use-conversation-typing";
import {
  TypingIndicator,
  type TypingParticipant,
} from "@cossistant/react/primitives/typing-indicator";
import type {
  AvailableAIAgent,
  ConversationEvent as ConversationEventType,
  Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { AnimatePresence } from "motion/react";
import { useMemo } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { cn } from "@/lib/utils";
import { ConversationEvent } from "./event";
import { MessageGroup } from "./group";

type Props = {
  ref?: React.RefObject<HTMLDivElement | null>;
  messages: MessageType[];
  events: ConversationEventType[];
  teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
  availableAIAgents: AvailableAIAgent[];
  seenData?: ConversationSeen[];
  visitor: ConversationHeader["visitor"];
  currentUserId: string;
  conversationId: string;
  className?: string;
  onFetchMoreIfNeeded?: () => void;
};

export function MessagesList({
  ref,
  messages = [],
  events = [],
  teamMembers = [],
  availableAIAgents = [],
  seenData = [],
  currentUserId,
  conversationId,
  className,
  onFetchMoreIfNeeded,
  visitor,
}: Props) {
  const {
    items,
    lastReadMessageMap,
    getLastReadMessageId,
    isMessageSeenByViewer,
  } = useGroupedMessages({
    messages,
    events,
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
        name: member.name || member.email.split("@")[0] || "Unknown member",
        image: member.image,
        lastSeenAt: member.lastSeenAt,
      })),
    [teamMembers]
  );

  const typingParticipants = useMemo(() => {
    return typingEntries
      .map((entry): TypingParticipant | null => {
        if (entry.actorType === "visitor") {
          return {
            id: entry.actorId,
            name: visitor.name || visitor.email || "Visitor",
            type: "visitor" as const,
            avatarUrl: visitor.avatar || null,
            preview: entry.preview,
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
                preview: null,
              }
            : {
                id: entry.actorId,
                name: "AI assistant",
                type: "ai" as const,
                avatarUrl: null,
                preview: null,
              };
        }

        return null;
      })
      .filter(
        (participant): participant is TypingParticipant => participant !== null
      );
  }, [typingEntries, visitor, availableAIAgents]);

  return (
    <PrimitiveMessageList
      autoScroll={true}
      className={cn(
        "overflow-y-auto scroll-smooth pt-20 pr-4 pb-48 pl-4",
        "scrollbar-thin scrollbar-thumb-background-300 scrollbar-track-transparent",
        "h-full w-full",
        className
      )}
      events={events}
      id="message-list"
      messages={messages}
      onScrollStart={onFetchMoreIfNeeded}
      ref={ref}
    >
      <div className="mx-auto xl:max-w-xl 2xl:max-w-2xl">
        <MessageListContainer className="flex min-h-full w-full flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, index) => {
              if (item.type === "event") {
                return (
                  <ConversationEvent
                    availableAIAgents={availableAIAgents}
                    availableHumanAgents={availableHumanAgents}
                    event={item.event}
                    key={item.event.id}
                  />
                );
              }

              // Use first message ID as stable key
              const groupKey = item.messages[0]?.id || `group-${index}`;

              return (
                <MessageGroup
                  availableAIAgents={availableAIAgents}
                  currentUserId={currentUserId}
                  key={groupKey}
                  lastReadMessageIds={lastReadMessageMap}
                  messages={item.messages}
                  teamMembers={teamMembers}
                  visitor={visitor}
                />
              );
            })}
          </AnimatePresence>
          {typingParticipants.length > 0 && (
            <TypingIndicator
              className="mt-2"
              participants={typingParticipants}
            />
          )}
        </MessageListContainer>
      </div>
    </PrimitiveMessageList>
  );
}
