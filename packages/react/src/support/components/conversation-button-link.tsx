import { type Conversation, ConversationStatus } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type React from "react";
import { useMemo } from "react";
import {
  useConversationTimelineItems,
  useConversationTyping,
  useSupport,
} from "../..";
import { useRenderElement } from "../../utils/use-render-element";
import { useSupportText } from "../text";
import { cn } from "../utils";
import { formatTimeAgo } from "../utils/time";
import { Avatar } from "./avatar";
import { coButtonVariants } from "./button";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

export type ConversationButtonLinkProps = {
  conversation: Conversation;
  onClick?: () => void;
  className?: string | ((state: ConversationButtonLinkState) => string);
  render?: (
    props: React.HTMLProps<HTMLButtonElement>,
    state: ConversationButtonLinkState
  ) => React.ReactElement;
};

export type ConversationButtonLinkAgent = {
  name: string;
  image: string | null;
  type: "human" | "ai" | "fallback";
};

export type ConversationButtonLinkState = {
  conversation: Conversation;
  lastMessage: {
    content: string;
    time: string;
    isFromVisitor: boolean;
    senderName?: string;
    senderImage?: string | null;
  } | null;
  assignedAgent: ConversationButtonLinkAgent;
};

function getLastTimelineItemInfo(
  item: NonNullable<Conversation["lastTimelineItem"]>,
  availableHumanAgents: ReturnType<typeof useSupport>["availableHumanAgents"],
  website: ReturnType<typeof useSupport>["website"],
  text: ReturnType<typeof useSupportText>
) {
  const isFromVisitor = item.visitorId !== null;

  let senderName = text("common.fallbacks.unknown");
  let senderImage: string | null = null;

  if (isFromVisitor) {
    senderName = text("common.fallbacks.you");
  } else if (item.userId) {
    const agent = availableHumanAgents.find((a) => a.id === item.userId);
    if (agent) {
      senderName = agent.name;
      senderImage = agent.image;
    } else {
      senderName = text("common.fallbacks.supportTeam");
    }
  } else if (item.aiAgentId && website?.availableAIAgents) {
    const aiAgent = website.availableAIAgents.find(
      (a) => a.id === item.aiAgentId
    );
    if (aiAgent) {
      senderName = aiAgent.name;
      senderImage = aiAgent.image;
    } else {
      senderName = text("common.fallbacks.aiAssistant");
    }
  } else {
    senderName = text("common.fallbacks.supportTeam");
  }

  return {
    content: item.text || "",
    time: formatTimeAgo(item.createdAt),
    isFromVisitor,
    senderName,
    senderImage,
  };
}

export function ConversationButtonLink({
  conversation,
  onClick,
  ...props
}: ConversationButtonLinkProps) {
  const { availableHumanAgents, availableAIAgents, website, visitor } =
    useSupport();
  const { items } = useConversationTimelineItems(conversation.id);
  const text = useSupportText();
  const typingEntries = useConversationTyping(conversation.id, {
    excludeVisitorId: visitor?.id ?? null,
  });

  // Check if anyone is typing in this conversation
  const typingInfo = useMemo(() => {
    if (typingEntries.length === 0) {
      return null;
    }

    const entry = typingEntries[0];
    let name = text("common.fallbacks.someone");
    let image: string | null = null;

    if (entry?.actorType === "user") {
      const human = availableHumanAgents.find(
        (agent) => agent.id === entry.actorId
      );
      name = human?.name || text("common.fallbacks.supportTeam");
      image = human?.image || null;
    } else if (entry?.actorType === "ai_agent") {
      const ai = availableAIAgents.find((agent) => agent.id === entry.actorId);
      name = ai?.name || text("common.fallbacks.aiAssistant");
      image = ai?.image || null;
    }

    return { name };
  }, [typingEntries, availableHumanAgents, availableAIAgents, text]);

  // Process the last timeline item (memoized to avoid expensive recomputation)
  const lastMessage = useMemo(() => {
    const cachedLastTimelineItem =
      // biome-ignore lint/style/useAtIndex: ok here
      items.length > 0 ? items[items.length - 1] : null;

    const timelineItemToDisplay =
      cachedLastTimelineItem || conversation.lastTimelineItem;

    return timelineItemToDisplay
      ? getLastTimelineItemInfo(
          timelineItemToDisplay,
          availableHumanAgents,
          website,
          text
        )
      : null;
  }, [
    items,
    conversation.lastTimelineItem,
    availableHumanAgents,
    website,
    text,
  ]);

  const assignedAgent = useMemo<ConversationButtonLinkAgent>(() => {
    const supportFallbackName = text("common.fallbacks.supportTeam");
    const aiFallbackName = text("common.fallbacks.aiAssistant");

    const knownItems = items.slice();
    if (
      conversation.lastTimelineItem &&
      !knownItems.some((item) => item.id === conversation.lastTimelineItem?.id)
    ) {
      knownItems.push(conversation.lastTimelineItem);
    }

    const lastAgentItem = [...knownItems]
      .reverse()
      .find((item) => item.userId !== null || item.aiAgentId !== null);

    if (lastAgentItem?.userId) {
      const human = availableHumanAgents.find(
        (agent) => agent.id === lastAgentItem.userId
      );

      if (human) {
        return {
          type: "human",
          name: human.name,
          image: human.image ?? null,
        } satisfies ConversationButtonLinkAgent;
      }

      return {
        type: "human",
        name: supportFallbackName,
        image: null,
      } satisfies ConversationButtonLinkAgent;
    }

    if (lastAgentItem?.aiAgentId) {
      const ai = availableAIAgents.find(
        (agent) => agent.id === lastAgentItem.aiAgentId
      );

      if (ai) {
        return {
          type: "ai",
          name: ai.name,
          image: ai.image ?? null,
        } satisfies ConversationButtonLinkAgent;
      }

      return {
        type: "ai",
        name: aiFallbackName,
        image: null,
      } satisfies ConversationButtonLinkAgent;
    }

    const fallbackHuman = availableHumanAgents[0];
    if (fallbackHuman) {
      return {
        type: "human",
        name: fallbackHuman.name,
        image: fallbackHuman.image ?? null,
      } satisfies ConversationButtonLinkAgent;
    }

    const fallbackAi = availableAIAgents[0];
    if (fallbackAi) {
      return {
        type: "ai",
        name: fallbackAi.name,
        image: fallbackAi.image ?? null,
      } satisfies ConversationButtonLinkAgent;
    }

    return {
      type: "fallback",
      name: supportFallbackName,
      image: null,
    } satisfies ConversationButtonLinkAgent;
  }, [
    items,
    conversation.lastTimelineItem,
    availableHumanAgents,
    availableAIAgents,
    text,
  ]);

  const conversationTitle = useMemo(() => {
    if (conversation.title) {
      return conversation.title;
    }

    if (lastMessage?.content) {
      return lastMessage.content;
    }

    return text("component.conversationButtonLink.fallbackTitle");
  }, [conversation.title, lastMessage?.content, text]);

  const state: ConversationButtonLinkState = {
    conversation,
    lastMessage,
    assignedAgent,
  };

  return useRenderElement("button", props, {
    state,
    props: {
      onClick,
      type: "button",
      className: cn(
        coButtonVariants({ variant: "secondary", size: "large" }),
        "relative gap-3 border-0 border-co-border/50 border-b text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0",
        typeof props.className === "function"
          ? props.className(state)
          : props.className
      ),
      children: (
        <>
          <Avatar
            className="size-8 flex-shrink-0"
            image={assignedAgent.image}
            name={assignedAgent.name}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {typingInfo ? (
              <BouncingDots />
            ) : (
              <>
                <div className="flex max-w-[90%] items-center justify-between gap-2">
                  <h3 className="truncate font-medium text-co-primary text-sm">
                    {conversationTitle}
                  </h3>
                </div>

                {lastMessage ? (
                  <p className="text-co-primary/60 text-xs">
                    {lastMessage.isFromVisitor ? (
                      <span>
                        {text(
                          "component.conversationButtonLink.lastMessage.visitor",
                          {
                            time: lastMessage.time,
                          }
                        )}
                      </span>
                    ) : (
                      <span>
                        {text(
                          "component.conversationButtonLink.lastMessage.agent",
                          {
                            name:
                              lastMessage.senderName ||
                              text("common.fallbacks.supportTeam"),
                            time: lastMessage.time,
                          }
                        )}
                      </span>
                    )}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div
            className={cn(
              "mr-6 inline-flex items-center rounded px-2 py-0.5 font-medium text-[9px] uppercase",
              conversation.status === ConversationStatus.OPEN
                ? "bg-co-success/20 text-co-success-foreground"
                : conversation.status === ConversationStatus.RESOLVED
                  ? "bg-co-neutral/20 text-co-neutral-foreground"
                  : "bg-co-warning/20 text-co-warning-foreground"
            )}
          >
            {conversation.status}
          </div>
          <Icon
            className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
            name="arrow-right"
            variant="default"
          />
        </>
      ),
    },
  });
}
