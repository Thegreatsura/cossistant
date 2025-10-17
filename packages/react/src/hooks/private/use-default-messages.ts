import { generateMessageId } from "@cossistant/core";
import {
  type Message,
  MessageType,
  MessageVisibility,
  SenderType,
} from "@cossistant/types";
import { useMemo } from "react";
import { useSupport } from "../../provider";

type UseDefaultMessagesParams = {
  conversationId: string;
};

/**
 * Mirrors the provider-configured default messages into a conversation shape so
 * that welcome content renders immediately while the backend conversation is
 * still being created. Agent fallbacks are resolved against available humans
 * and AI agents exposed by the provider context.
 */
export function useDefaultMessages({
  conversationId,
}: UseDefaultMessagesParams): Message[] {
  const { defaultMessages, availableAIAgents, availableHumanAgents } =
    useSupport();

  const memoisedDefaultMessages = useMemo(
    () =>
      defaultMessages.map((message, index) => {
        const messageId = generateMessageId();
        const timestamp = new Date().toISOString();

        return {
          bodyMd: message.content,
          type: MessageType.TEXT,
          id: messageId,
          createdAt: timestamp,
          conversationId,
          updatedAt: timestamp,
          deletedAt: null,
          userId:
            message.senderType === SenderType.TEAM_MEMBER
              ? message.senderId || availableHumanAgents[0]?.id || null
              : null,
          aiAgentId:
            message.senderType === SenderType.AI
              ? message.senderId || availableAIAgents[0]?.id || null
              : null,
          visitorId:
            message.senderType === SenderType.VISITOR
              ? message.senderId || null
              : null,
          visibility: MessageVisibility.PUBLIC,
          parentMessageId: null,
          modelUsed: null,
        };
      }),
    [
      defaultMessages,
      availableHumanAgents[0]?.id,
      availableAIAgents[0]?.id,
      conversationId,
    ],
  );

  return memoisedDefaultMessages;
}
