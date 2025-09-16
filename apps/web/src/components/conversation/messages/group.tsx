import {
  MessageGroupAvatar,
  MessageGroupContent,
  MessageGroupHeader,
  MessageGroupReadIndicator,
  MessageGroup as PrimitiveMessageGroup,
} from "@cossistant/react/primitive/message-group";
import type {
  AvailableAIAgent,
  AvailableHumanAgent,
  Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import type { ConversationHeader } from "@/contexts/inboxes";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import { Message } from "./message";

type Props = {
  messages: MessageType[];
  availableAIAgents: AvailableAIAgent[];
  availableHumanAgents: AvailableHumanAgent[];
  lastReadMessageIds?: Map<string, string>; // Map of userId -> lastMessageId they read
  currentUserId?: string;
  visitor: ConversationHeader["visitor"];
};

export function MessageGroup({
  messages,
  availableAIAgents,
  availableHumanAgents,
  lastReadMessageIds,
  currentUserId,
  visitor,
}: Props) {
  if (messages.length === 0) {
    return null;
  }

  // Get agent info for the sender
  const firstMessage = messages[0];
  const humanAgent = availableHumanAgents.find(
    (agent) => agent.id === firstMessage?.userId
  );
  const aiAgent = availableAIAgents.find(
    (agent) => agent.id === firstMessage?.aiAgentId
  );

  // Extract who has read up to the last message
  const lastMessageId = messages[messages.length - 1]?.id;
  const readByIds: string[] = [];

  if (lastReadMessageIds) {
    lastReadMessageIds.forEach((messageId, userId) => {
      // Check if this user has read up to or past the last message in this group
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const lastIndex = messages.length - 1;
      if (messageIndex >= lastIndex) {
        readByIds.push(userId);
      }
    });
  }

  return (
    <PrimitiveMessageGroup
      messages={messages}
      viewerId={currentUserId}
      viewerType={SenderType.TEAM_MEMBER}
      seenByIds={readByIds}
      lastReadMessageIds={lastReadMessageIds}
    >
      {({
        isSentByViewer,
        isReceivedByViewer,
        isVisitor,
        isAI,
        isTeamMember,
      }) => (
        <div
          className={cn(
            "flex w-full gap-2",
            // From dashboard POV: visitor messages are received (left side)
            // Team member/AI messages sent by viewer are on right side
            isSentByViewer && "flex-row-reverse",
            isReceivedByViewer && "flex-row"
          )}
        >
          {/* Avatar - only show for received messages */}
          {isReceivedByViewer && (
            <MessageGroupAvatar className="flex flex-shrink-0 flex-col justify-end">
              {isVisitor ? (
                <Avatar
                  className="size-7"
                  url={visitor?.avatar}
                  fallbackName={getVisitorNameWithFallback(visitor)}
                  lastOnlineAt={visitor?.lastSeenAt}
                />
              ) : isAI ? (
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                  <Logo className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <Avatar
                  className="size-7"
                  url={humanAgent?.image}
                  fallbackName={humanAgent?.name || "Team"}
                  lastOnlineAt={humanAgent?.lastSeenAt}
                />
              )}
            </MessageGroupAvatar>
          )}

          <MessageGroupContent
            className={cn("flex flex-col gap-1", isSentByViewer && "items-end")}
          >
            {/* Header - show sender name for received messages */}
            {isReceivedByViewer && (
              <MessageGroupHeader className="px-1 text-muted-foreground text-xs">
                {isVisitor
                  ? getVisitorNameWithFallback(visitor)
                  : isAI
                    ? aiAgent?.name || "AI Assistant"
                    : humanAgent?.name || "Team Member"}
              </MessageGroupHeader>
            )}

            {/* Messages with read indicators */}
            {messages.map((message, index) => (
              <div key={message.id} className="relative">
                <Message
                  isLast={index === messages.length - 1}
                  message={message}
                  isSentByViewer={isSentByViewer}
                />

                {/* Show read indicator where users stopped reading */}
                <MessageGroupReadIndicator
                  messageId={message.id}
                  lastReadMessageIds={lastReadMessageIds}
                  className="mt-1"
                >
                  {({ lastReaderIds }) => {
                    if (lastReaderIds.length === 0) return null;

                    // Filter out the current user and the sender
                    const otherReaders = lastReaderIds.filter(
                      (id) =>
                        id !== currentUserId &&
                        id !== firstMessage?.userId &&
                        id !== firstMessage?.visitorId &&
                        id !== firstMessage?.aiAgentId
                    );

                    if (otherReaders.length === 0) return null;

                    // Get names/avatars of people who stopped reading here
                    const readerInfo = otherReaders
                      .map((id) => {
                        const human = availableHumanAgents.find(
                          (a) => a.id === id
                        );
                        const ai = availableAIAgents.find((a) => a.id === id);
                        if (human) {
                          return {
                            id,
                            name: human.name,
                            image: human.image,
                            type: "human",
                          };
                        }
                        if (ai) {
                          return { id, name: ai.name, type: "ai" };
                        }
                        // Check if it's the visitor
                        if (messages.some((m) => m.visitorId === id)) {
                          return { id, name: "Visitor", type: "visitor" };
                        }
                        return null;
                      })
                      .filter(Boolean);

                    if (readerInfo.length === 0) return null;

                    return (
                      <div
                        className={cn(
                          "flex items-center gap-1 px-1",
                          isSentByViewer ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className="flex -space-x-2">
                          {readerInfo.slice(0, 3).map(
                            (reader) =>
                              reader && (
                                <div
                                  key={reader.id}
                                  className="relative"
                                  title={`${reader.name} read up to here`}
                                >
                                  {reader.type === "human" && reader.image ? (
                                    <img
                                      src={reader.image}
                                      alt={reader.name}
                                      className="size-4 rounded-full border border-background"
                                    />
                                  ) : reader.type === "ai" ? (
                                    <div className="flex size-4 items-center justify-center rounded-full border border-background bg-primary/10">
                                      <Logo className="h-2.5 w-2.5 text-primary" />
                                    </div>
                                  ) : (
                                    <div className="flex size-4 items-center justify-center rounded-full border border-background bg-muted">
                                      <span className="text-[8px] font-medium text-muted-foreground">
                                        {reader.type === "visitor"
                                          ? "V"
                                          : reader.name?.[0]?.toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                          )}
                        </div>
                        {readerInfo.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{readerInfo.length - 3}
                          </span>
                        )}
                      </div>
                    );
                  }}
                </MessageGroupReadIndicator>
              </div>
            ))}
          </MessageGroupContent>
        </div>
      )}
    </PrimitiveMessageGroup>
  );
}
