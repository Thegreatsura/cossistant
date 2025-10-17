import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import * as React from "react";
import { cn } from "../utils";
import { AvatarStack } from "./avatar-stack";

export type TypingParticipantType = "visitor" | "team_member" | "ai";

export type TypingParticipant = {
  id: string;
  type: TypingParticipantType;
};

export type TypingIndicatorProps = React.HTMLAttributes<HTMLDivElement> & {
  participants: TypingParticipant[];
  availableAIAgents?: AvailableAIAgent[];
  availableHumanAgents?: AvailableHumanAgent[];
  withAvatars?: boolean;
};

export const BouncingDots = () => {
  return (
    <div className="flex gap-1">
      <span className="dot-bounce-1 size-1 rounded-full bg-co-primary" />
      <span className="dot-bounce-2 size-1 rounded-full bg-co-primary" />
      <span className="dot-bounce-3 size-1 rounded-full bg-co-primary" />
    </div>
  );
};

export const TypingIndicator = React.forwardRef<
  HTMLDivElement,
  TypingIndicatorProps
>(
  (
    {
      participants,
      availableAIAgents = [],
      availableHumanAgents = [],
      withAvatars = true,
      className,
      ...props
    },
    ref,
  ) => {
    if (!participants || participants.length === 0) {
      return null;
    }

    // Separate AI and human participants
    const humanParticipantIds = participants
      .filter((p) => p.type === "team_member")
      .map((p) => p.id);

    const aiParticipantIds = participants
      .filter((p) => p.type === "ai")
      .map((p) => p.id);

    // Get matching agents
    const typingHumanAgents = availableHumanAgents.filter((agent) =>
      humanParticipantIds.includes(agent.id),
    );

    const typingAIAgents = availableAIAgents.filter((agent) =>
      aiParticipantIds.includes(agent.id),
    );

    return (
      <div
        className={cn("flex items-center gap-6", className)}
        ref={ref}
        {...props}
      >
        {withAvatars && (
          <AvatarStack
            aiAgents={typingAIAgents}
            humanAgents={typingHumanAgents}
            size={24}
            spacing={16}
          />
        )}
        <BouncingDots />
      </div>
    );
  },
);

TypingIndicator.displayName = "TypingIndicator";
