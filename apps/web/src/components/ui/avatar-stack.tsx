import { AvatarStackItem } from "@cossistant/react/support/components/avatar-stack";
import { useRenderElement } from "@cossistant/react/utils/use-render-element";
import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Logo } from "./logo";

type AvatarStackProps = {
  humanAgents: AvailableHumanAgent[];
  aiAgents: AvailableAIAgent[];
  hideBranding?: boolean;
  hideDefaultAIAgent?: boolean;
  className?: string;
  /** Size of avatars (default: 44px) */
  size?: number;
  /** Space between avatars (default: 28px) */
  spacing?: number;
  /** Gap width between avatars (default: 2px) */
  gapWidth?: number;
};

export function AvatarStack({
  humanAgents,
  aiAgents,
  hideBranding = false,
  hideDefaultAIAgent = true,
  className,
  size = 44,
  spacing = 28,
  gapWidth = 3,
}: AvatarStackProps) {
  const displayedHumanAgents = humanAgents.slice(0, 2);
  const remainingHumanAgentsCount = Math.max(0, humanAgents.length - 2);

  // Create array of all items to display
  const items = [
    ...displayedHumanAgents.map((agent) => ({
      type: "human" as const,
      agent,
    })),
    ...(remainingHumanAgentsCount > 0
      ? [
          {
            type: "count" as const,
            count: remainingHumanAgentsCount,
          },
        ]
      : []),
    ...(hideDefaultAIAgent
      ? []
      : [
          {
            type: "ai" as const,
            agent: aiAgents[0],
          },
        ]),
  ];

  return useRenderElement(
    "div",
    { className },
    {
      props: {
        className: "inline-grid items-center",
        style: {
          gridTemplateColumns: `repeat(${items.length}, ${spacing}px)`,
        },
        children: items.map((item, index) => (
          <AvatarStackItem
            gapWidth={gapWidth}
            index={index}
            key={`avatar-${index}`}
            size={size}
            spacing={spacing}
          >
            {item.type === "human" && (
              <Avatar
                className={cn("size-full")}
                fallbackName={item.agent.name}
                lastOnlineAt={item.agent.lastSeenAt}
                url={item.agent.image}
              />
            )}
            {item.type === "count" && (
              <div className="flex size-full items-center justify-center rounded-full bg-co-background-200 font-medium text-co-text-900 text-sm dark:bg-co-background-500">
                +{item.count}
              </div>
            )}
            {item.type === "ai" && (
              <div className="flex size-full items-center justify-center rounded-full bg-co-background-200 dark:bg-co-background-600">
                <Logo className="h-[50%] min-h-4 w-[50%] min-w-4" />
              </div>
            )}
          </AvatarStackItem>
        )),
      },
    }
  );
}
