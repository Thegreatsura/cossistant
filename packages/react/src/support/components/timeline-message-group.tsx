import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { motion } from "motion/react";
import type React from "react";
import { memo, useMemo } from "react";
import {
	TimelineItemGroup as PrimitiveTimelineItemGroup,
	TimelineItemGroupAvatar,
	TimelineItemGroupContent,
	TimelineItemGroupHeader,
	TimelineItemGroupSeenIndicator,
} from "../../primitives/timeline-item-group";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { CossistantLogo } from "./cossistant-branding";
import { TimelineMessageItem } from "./timeline-message-item";

const MESSAGE_ANIMATION = {
	initial: { opacity: 0, y: 6 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0 },
	transition: {
		duration: 0.1,
		ease: [0.25, 0.46, 0.45, 0.94] as const, // easeOutCubic
	},
} as const;

const SEEN_ANIMATION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	transition: {
		duration: 0.1,
		ease: "easeOut" as const,
	},
} as const;

export type TimelineMessageGroupProps = {
        items: TimelineItem[];
        availableAIAgents: AvailableAIAgent[];
        availableHumanAgents: AvailableHumanAgent[];
        currentVisitorId?: string;
        seenByIds?: string[];
};

const EMPTY_SEEN_BY_IDS: string[] = Object.freeze([]) as string[];

const TimelineMessageGroupComponent: React.FC<TimelineMessageGroupProps> = ({
        items,
        availableAIAgents,
        availableHumanAgents,
        currentVisitorId,
        seenByIds = EMPTY_SEEN_BY_IDS,
}) => {
        // Get agent info for the sender
        const firstItem = items[0];
        const humanAgent = availableHumanAgents.find(
                (agent) => agent.id === firstItem?.userId
	);
	const aiAgent = availableAIAgents.find(
		(agent) => agent.id === firstItem?.aiAgentId
	);

	const seenByNames = useMemo(() => {
		const deduped = new Set<string>();
		for (const id of seenByIds) {
			const human = availableHumanAgents.find((agent) => agent.id === id);
			if (human?.name) {
				deduped.add(human.name);
				continue;
			}
			const ai = availableAIAgents.find((agent) => agent.id === id);
			if (ai?.name) {
				deduped.add(ai.name);
			}
		}
		return Array.from(deduped);
	}, [seenByIds, availableHumanAgents, availableAIAgents]);

	if (items.length === 0) {
		return null;
	}

	const hasSeenIndicator = seenByIds.length > 0 && seenByNames.length > 0;

	return (
		<PrimitiveTimelineItemGroup
			items={items}
			seenByIds={seenByIds}
			viewerId={currentVisitorId}
			viewerType={SenderType.VISITOR}
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
						// Support widget POV: visitor messages are sent (right side)
						// Agent messages are received (left side)
						isSentByViewer && "flex-row-reverse",
						isReceivedByViewer && "flex-row"
					)}
				>
					{/* Avatar - only show for received messages (agents) */}
					{isReceivedByViewer && (
						<TimelineItemGroupAvatar className="flex flex-shrink-0 flex-col justify-end">
							{isAI ? (
								<div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
									<CossistantLogo className="h-4 w-4 text-primary" />
								</div>
							) : (
								<Avatar
									className="size-6"
									image={humanAgent?.image}
									name={humanAgent?.name || "Support"}
								/>
							)}
						</TimelineItemGroupAvatar>
					)}

					<TimelineItemGroupContent
						className={cn("flex flex-col gap-1", isSentByViewer && "items-end")}
					>
						{/* Header - show sender name for received messages (agents) */}
						{isReceivedByViewer && (
							<TimelineItemGroupHeader className="px-1 text-muted-foreground text-xs">
								{isAI
									? aiAgent?.name || "AI Assistant"
									: humanAgent?.name || "Support"}
							</TimelineItemGroupHeader>
						)}

						{items.map((item, index) => (
							<motion.div key={item.id} {...MESSAGE_ANIMATION}>
								<TimelineMessageItem
									isLast={index === items.length - 1}
									isSentByViewer={isSentByViewer}
									item={item}
								/>
							</motion.div>
						))}

						{isSentByViewer && (
							<div className={cn("", hasSeenIndicator && "mt-2")}>
								<div className="min-h-[1.25rem]">
									{hasSeenIndicator && (
										<motion.div key="seen-indicator" {...SEEN_ANIMATION}>
											<TimelineItemGroupSeenIndicator
												className="px-1 text-muted-foreground text-xs"
												seenByIds={seenByIds}
											>
												{() => `Seen by ${seenByNames.join(", ")}`}
											</TimelineItemGroupSeenIndicator>
										</motion.div>
									)}
								</div>
							</div>
						)}
					</TimelineItemGroupContent>
				</div>
			)}
		</PrimitiveTimelineItemGroup>
	);
};

const areStringArraysEqual = (a: string[] = EMPTY_SEEN_BY_IDS, b: string[] = EMPTY_SEEN_BY_IDS) => {
        if (a === b) {
                return true;
        }

        if (a.length !== b.length) {
                return false;
        }

        for (let index = 0; index < a.length; index++) {
                if (a[index] !== b[index]) {
                        return false;
                }
        }

        return true;
};

const areTimelineItemsEqual = (a: TimelineItem[], b: TimelineItem[]): boolean => {
        if (a === b) {
                return true;
        }

        if (a.length !== b.length) {
                return false;
        }

        for (let index = 0; index < a.length; index++) {
                const previous = a[index];
                const next = b[index];

                if (previous === next) {
                        continue;
                }

                if (
                        previous?.id !== next?.id ||
                        previous?.type !== next?.type ||
                        previous?.text !== next?.text ||
                        previous?.createdAt !== next?.createdAt ||
                        previous?.deletedAt !== next?.deletedAt ||
                        previous?.visitorId !== next?.visitorId ||
                        previous?.userId !== next?.userId ||
                        previous?.aiAgentId !== next?.aiAgentId
                ) {
                        return false;
                }
        }

        return true;
};

const areAgentsEqual = <T extends { id: string; name?: string | null; image?: string | null }>(
        previous: T[],
        next: T[]
): boolean => {
        if (previous === next) {
                return true;
        }

        if (previous.length !== next.length) {
                return false;
        }

        for (let index = 0; index < previous.length; index++) {
                const prevAgent = previous[index];
                const nextAgent = next[index];

                if (
                        prevAgent.id !== nextAgent.id ||
                        (prevAgent.name ?? null) !== (nextAgent.name ?? null) ||
                        (prevAgent.image ?? null) !== (nextAgent.image ?? null)
                ) {
                        return false;
                }
        }

        return true;
};

const areTimelineMessageGroupPropsEqual = (
        previous: TimelineMessageGroupProps,
        next: TimelineMessageGroupProps
) => {
        if (previous.currentVisitorId !== next.currentVisitorId) {
                return false;
        }

        if (!areAgentsEqual(previous.availableAIAgents, next.availableAIAgents)) {
                return false;
        }

        if (!areAgentsEqual(previous.availableHumanAgents, next.availableHumanAgents)) {
                return false;
        }

        if (!areTimelineItemsEqual(previous.items, next.items)) {
                return false;
        }

        if (!areStringArraysEqual(previous.seenByIds, next.seenByIds)) {
                return false;
        }

        return true;
};

export const TimelineMessageGroup = memo(
        TimelineMessageGroupComponent,
        areTimelineMessageGroupPropsEqual
);

TimelineMessageGroup.displayName = "TimelineMessageGroup";
