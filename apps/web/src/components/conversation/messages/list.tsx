import {
  MessageListContainer,
  MessageList as PrimitiveMessageList,
} from "@cossistant/react/primitive/message-list";
import { useGroupedMessages } from "@cossistant/react/support/hooks";
import type {
  AvailableAIAgent,
  AvailableHumanAgent,
  ConversationEvent as ConversationEventType,
  Message as MessageType,
} from "@cossistant/types";
import { cn } from "@/lib/utils";
import { ConversationEvent } from "./event";
import { MessageGroup } from "./group";

type Props = {
  messages: MessageType[];
  events: ConversationEventType[];
  availableAIAgents: AvailableAIAgent[];
  availableHumanAgents: AvailableHumanAgent[];
  className?: string;
};

export function MessagesList({
  messages = [],
  events = [],
  availableAIAgents = [],
  availableHumanAgents = [],
  className,
}: Props) {
  const groupedMessages = useGroupedMessages({
    messages,
    events,
    availableAIAgents,
    availableHumanAgents,
  });

  return (
    <PrimitiveMessageList
      autoScroll={true}
      className={cn(
        "overflow-y-auto scroll-smooth pt-60 pb-40",
        "scrollbar-thin scrollbar-thumb-background-300 scrollbar-track-transparent",
        "h-full w-full",
        className
      )}
      events={events}
      id="message-list"
      messages={messages}
    >
      <div className="2xl:max-w-3xl max-w-2xl mx-auto">
        <MessageListContainer className="flex min-h-full w-full flex-col gap-3">
          {groupedMessages.map((item, index) => {
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
            return (
              <MessageGroup
                availableAIAgents={availableAIAgents}
                availableHumanAgents={availableHumanAgents}
                key={`group-${index}`}
                messages={item.messages}
              />
            );
          })}
          {/* {isTyping && (
          <TypingIndicator
            isAI={isTyping.type === SenderType.AI}
            senderImage={availableAgents[0]?.image || undefined}
            senderName={availableAgents[0]?.name || "Support"}
          />
          )} */}
        </MessageListContainer>
      </div>
    </PrimitiveMessageList>
  );
}
