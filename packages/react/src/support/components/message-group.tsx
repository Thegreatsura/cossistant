import type {
  AvailableAIAgent,
  AvailableHumanAgent,
  Message as MessageType,
} from "@cossistant/types";
import { motion } from "motion/react";
import type React from "react";
import {
  MessageGroupAvatar,
  MessageGroupContent,
  MessageGroupHeader,
  MessageGroup as PrimitiveMessageGroup,
} from "../../primitive/message-group";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { CossistantLogo } from "./cossistant-branding";
import { Message } from "./message";

export interface MessageGroupProps {
  messages: MessageType[];
  availableAIAgents: AvailableAIAgent[];
  availableHumanAgents: AvailableHumanAgent[];
}

export const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  availableAIAgents,
  availableHumanAgents,
}) => {
  if (messages.length === 0) {
    return null;
  }

  const humanAgent = availableHumanAgents.find(
    (agent) => agent.id === messages[0]?.userId
  );

  return (
    <PrimitiveMessageGroup messages={messages}>
      {({ isVisitor, isAI }) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex w-full gap-2 px-2",
            isVisitor && "flex-row-reverse",
            !isVisitor && "flex-row"
          )}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {!isVisitor && (
            <MessageGroupAvatar className="flex flex-shrink-0 flex-col justify-end">
              {isAI ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <CossistantLogo className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <Avatar
                  className="size-6"
                  image={humanAgent?.image}
                  name={humanAgent?.name || "Support"}
                />
              )}
            </MessageGroupAvatar>
          )}

          <MessageGroupContent
            className={cn("flex flex-col gap-1", isVisitor && "items-end")}
          >
            {!isVisitor && (humanAgent?.name || isAI) && (
              <MessageGroupHeader className="px-1 text-muted-foreground text-xs">
                {isAI ? "Cossistant AI" : humanAgent?.name}
              </MessageGroupHeader>
            )}

            {messages.map((message, index) => (
              <Message
                isLast={index === messages.length - 1}
                key={message.id}
                message={message}
              />
            ))}
          </MessageGroupContent>
        </motion.div>
      )}
    </PrimitiveMessageGroup>
  );
};
