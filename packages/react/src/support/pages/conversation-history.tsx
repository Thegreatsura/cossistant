import { useSupport } from "@cossistant/react";
import { PENDING_CONVERSATION_ID } from "@cossistant/react/utils/id";
import type React from "react";
import { useConversationHistoryPage } from "../../hooks/use-conversation-history-page";
import { AvatarStack } from "../components/avatar-stack";
import { Button } from "../components/button";
import { ConversationButtonLink } from "../components/conversation-button-link";
import { Header } from "../components/header";
import Icon from "../components/icons";
import { TextEffect } from "../components/text-effect";
import { Watermark } from "../components/watermark";
import { useSupportNavigation } from "../store/support-store";

/**
 * Conversation history page component.
 *
 * Displays:
 * - List of all conversations
 * - Pagination controls
 * - Button to start new conversation
 *
 * All logic is handled by the useConversationHistoryPage hook.
 */
export const ConversationHistoryPage: React.FC = () => {
  const { goBack, canGoBack, navigate } = useSupportNavigation();
  const { availableAIAgents, availableHumanAgents } = useSupport();

  const history = useConversationHistoryPage({
    initialVisibleCount: 4,
    onOpenConversation: (conversationId) => {
      navigate({
        page: "CONVERSATION",
        params: {
          conversationId,
        },
      });
    },
    onStartConversation: (initialMessage) => {
      navigate({
        page: "CONVERSATION",
        params: {
          conversationId: PENDING_CONVERSATION_ID,
          initialMessage,
        },
      });
    },
  });

  const handleGoBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate({
        page: "HOME",
      });
    }
  };

  return (
    <>
      <Header onGoBack={handleGoBack}>
        <div className="flex w-full items-center justify-between gap-2 py-3">
          <div className="flex flex-col" />
          <AvatarStack
            aiAgents={availableAIAgents}
            gapWidth={2}
            humanAgents={availableHumanAgents}
            size={28}
            spacing={20}
          />
        </div>
      </Header>
      <div className="sticky top-4 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <TextEffect
            as="h2"
            className="max-w-xs text-balance text-center font-co-sans text-2xl leading-normal"
            delay={0.5}
            preset="fade-in-blur"
          >
            Conversations history
          </TextEffect>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2 px-6 pt-20 pb-4">
        {history.conversations.length > 0 && (
          <>
            {history.hasMore && (
              <Button
                className="relative mt-6 w-full text-co-primary/40 text-xs hover:text-co-primary"
                onClick={history.showAll}
                variant="ghost"
              >
                +{history.remainingCount} more
              </Button>
            )}
            <div className="mb-6 flex w-full flex-col rounded border border-co-border/50">
              {history.visibleConversations.map((conversation) => (
                <ConversationButtonLink
                  conversation={conversation}
                  key={conversation.id}
                  onClick={() => history.openConversation(conversation.id)}
                />
              ))}
            </div>
          </>
        )}

        <div className="sticky bottom-4 z-10 flex w-full flex-col items-center gap-2">
          <Button
            className="relative w-full justify-between"
            onClick={() => history.startConversation()}
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
      </div>
    </>
  );
};
