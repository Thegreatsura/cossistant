import { type Conversation, ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useConversationPreview } from "../../hooks/use-conversation-preview";
import {
        ConversationButton,
        type ConversationButtonState,
        type ConversationButtonStatusTone,
} from "../../primitives/conversation-button";
import { useSupportText } from "../text";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

export type ConversationButtonLinkProps = {
        conversation: Conversation;
        onClick?: () => void;
        className?: string | ((state: ConversationButtonLinkState) => string);
        render?: (
                props: React.HTMLProps<HTMLButtonElement>,
                state: ConversationButtonLinkState,
        ) => React.ReactElement;
};

type ConversationPreviewData = ReturnType<typeof useConversationPreview>;

export type ConversationButtonLinkAgent = ConversationPreviewData["assignedAgent"];

export type ConversationButtonLinkState = ConversationButtonState<{
        conversation: Conversation;
        lastMessage: ConversationPreviewData["lastMessage"];
        typing: ConversationPreviewData["typing"];
        timeline: ConversationPreviewData["timeline"];
}>;

const STATUS_TONE_MAP: Record<ConversationStatus, ConversationButtonStatusTone> = {
        [ConversationStatus.OPEN]: "success",
        [ConversationStatus.RESOLVED]: "neutral",
        [ConversationStatus.SPAM]: "warning",
};

export function ConversationButtonLink({
        conversation,
        onClick,
        className,
        render,
}: ConversationButtonLinkProps): React.ReactElement | null {
        const preview = useConversationPreview({ conversation });
        const text = useSupportText();
        const { lastMessage, assignedAgent, typing } = preview;
        const conversationTitle = preview.title;

        const statusTone = STATUS_TONE_MAP[conversation.status] ?? "neutral";

        const lastMessageContent = lastMessage
                ? lastMessage.isFromVisitor
                        ? (
                                  <span>
                                          {text("component.conversationButtonLink.lastMessage.visitor", {
                                                  time: lastMessage.time,
                                          })}
                                  </span>
                          )
                        : (
                                  <span>
                                          {text("component.conversationButtonLink.lastMessage.agent", {
                                                  name:
                                                          lastMessage.senderName ||
                                                          text("common.fallbacks.supportTeam"),
                                                  time: lastMessage.time,
                                          })}
                                  </span>
                          )
                : undefined;

        const state: ConversationButtonLinkState = {
                conversation,
                title: conversationTitle,
                lastMessage,
                lastMessageText: lastMessageContent,
                assignedAgent,
                typing,
                timeline: preview.timeline,
                isTyping: typing.isTyping,
                status: conversation.status,
                statusTone,
        };

        return (
                <ConversationButton<ConversationButtonLinkState>
                        assignedAgent={assignedAgent}
                        className={className}
                        isTyping={typing.isTyping}
                        lastMessage={lastMessageContent}
                        onClick={onClick}
                        render={render}
                        state={state}
                        status={conversation.status}
                        statusTone={statusTone}
                        title={conversationTitle}
                        trailingIcon={
                                <Icon
                                        className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
                                        name="arrow-right"
                                        variant="default"
                                />
                        }
                        typingIndicator={<BouncingDots />}
                />
        );
}
