import { useSupport } from "@cossistant/react";
import { PENDING_CONVERSATION_ID } from "@cossistant/react/utils/id";
import type React from "react";
import { AvatarStack } from "../components/avatar-stack";
import { Button } from "../components/button";
import { ConversationButtonLink } from "../components/conversation-button-link";
import { Header } from "../components/header";
import Icon from "../components/icons";
import { TextEffect } from "../components/text-effect";
import { Watermark } from "../components/watermark";
import { useSupportNavigation } from "../store/support-store";

export const ConversationHistoryPage: React.FC = () => {
  const { goBack, canGoBack, navigate } = useSupportNavigation();
  const { availableAIAgents, availableHumanAgents, conversations } =
    useSupport();

  const handleGoBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate({
        page: "HOME",
      });
    }
  };

  const handleStartConversation = (initialMessage?: string) => () =>
    navigate({
      page: "CONVERSATION",
      params: {
        conversationId: PENDING_CONVERSATION_ID,
        initialMessage,
      },
    });

  const handleOpenConversation = (conversationId: string) => () =>
    navigate({
      page: "CONVERSATION",
      params: {
        conversationId,
      },
    });

  return (
    <>
      <Header onGoBack={handleGoBack}>
        <div className="flex w-full items-center justify-between gap-2 py-3">
          <div className="flex flex-col" />
          <AvatarStack
            aiAgents={availableAIAgents}
            humanAgents={availableHumanAgents}
          />
        </div>
      </Header>
      <div className="relative flex h-full flex-col gap-10 overflow-y-auto">
        <div className="sticky top-4 flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <TextEffect
              as="h2"
              className="max-w-xs text-balance text-center font-co-sans text-2xl leading-normal"
              delay={0.5}
              preset="fade-in-blur"
            >
              Conversation history
            </TextEffect>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2 px-6 pb-4">
          {conversations && conversations.length > 0 && (
            <div className="flex w-full flex-col rounded border border-co-border/50">
              {conversations.map((conversation) => (
                <ConversationButtonLink
                  conversation={conversation}
                  key={conversation.id}
                  onClick={handleOpenConversation(conversation.id)}
                />
              ))}
            </div>
          )}

          <div className="sticky bottom-4 z-10 flex w-full flex-col items-center gap-2">
            <Button
              className="relative w-full justify-between"
              onClick={handleStartConversation()}
              size="large"
              variant="secondary"
            >
              <Icon
                className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
                name="arrow-right"
                variant="default"
              />
              Ask us a question
            </Button>
            <Watermark className="mt-4 mb-2" />
          </div>
          <div />
        </div>
      </div>
    </>
  );
};
