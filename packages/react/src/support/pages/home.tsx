import { motion } from "motion/react";
import type React from "react";
import { useMemo } from "react";
import { useConversations, useSupport } from "../..";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { AvatarStack } from "../components/avatar-stack";
import { Button } from "../components/button";
import { ConversationButtonLink } from "../components/conversation-button-link";
import { Header } from "../components/header";
import Icon from "../components/icons";
import { TextEffect } from "../components/text-effect";
import { Watermark } from "../components/watermark";
import { useSupportNavigation } from "../store/support-store";

export const HomePage = () => {
  const { website, availableHumanAgents, visitor, quickOptions, client } =
    useSupport();
  const { navigate } = useSupportNavigation();
  const { conversations } = useConversations(client);

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

  const handleOpenConversationHistory = () =>
    navigate({
      page: "CONVERSATION_HISTORY",
    });

  // const defaultMessages = useDefaultMessages({ conversationId: "default" });
  const { lastOpenConversation, availableConversationsAmount } = useMemo(() => {
    console.log(
      "[HomePage] Conversations:",
      conversations?.map((c) => ({
        id: c.id,
        status: c.status,
        updatedAt: c.updatedAt,
      }))
    );

    const _lastOpenConversation = conversations?.find(
      (conversation) => conversation.status === "open"
    );

    console.log(
      "[HomePage] Last open conversation:",
      _lastOpenConversation?.id
    );

    return {
      lastOpenConversation: _lastOpenConversation,
      availableConversationsAmount: Math.max(
        (conversations?.length || 0) - 1,
        0
      ),
    };
  }, [conversations]);

  return (
    <div className="relative flex h-full flex-col gap-10 overflow-y-auto">
      <Header>{/* <NavigationTab /> */}</Header>
      <div className="sticky top-4 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate="visible"
            exit="exit"
            initial="hidden"
            transition={{
              delay: 0.1,
            }}
            variants={{
              hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
              visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              exit: { opacity: 0, y: 20, filter: "blur(12px)" },
            }}
          >
            <AvatarStack
              aiAgents={website?.availableAIAgents || []}
              className="size-14"
              humanAgents={availableHumanAgents}
            />
            <p className="mb-4 text-co-primary/80 text-sm">
              {website?.name} support
            </p>
          </motion.div>
          <TextEffect
            as="h2"
            className="max-w-xs text-balance text-center font-co-sans text-2xl leading-normal"
            delay={0.5}
            preset="fade-in-blur"
          >
            Good morning{visitor?.name ? ` ${visitor.name}` : ""}, How can we
            help?
          </TextEffect>

          {quickOptions.length > 0 && (
            <motion.div
              animate="visible"
              className="mt-6 inline-flex gap-2"
              exit="exit"
              initial="hidden"
              transition={{
                delay: 1.3,
              }}
              variants={{
                hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                exit: { opacity: 0, y: 20, filter: "blur(12px)" },
              }}
            >
              {quickOptions?.map((option) => (
                <Button
                  className="rounded-full border-dashed"
                  key={option}
                  onClick={handleStartConversation(option)}
                  size="default"
                  variant="outline"
                >
                  {option}
                </Button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-center justify-center gap-2 px-6 pb-4">
        {availableConversationsAmount > 0 && (
          <Button
            className="relative w-full text-co-primary/40 text-xs hover:text-co-primary"
            onClick={handleOpenConversationHistory}
            variant="ghost"
          >
            + {availableConversationsAmount} more conversations
          </Button>
        )}

        {lastOpenConversation && (
          <div className="flex w-full flex-col rounded border border-co-border/50">
            <ConversationButtonLink
              conversation={lastOpenConversation}
              key={lastOpenConversation.id}
              onClick={handleOpenConversation(lastOpenConversation.id)}
            />
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
  );
};
