import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { motion } from "motion/react";
import type React from "react";
import {
	TimelineItemGroup as PrimitiveTimelineItemGroup,
	TimelineItemGroupAvatar,
	TimelineItemGroupContent,
	TimelineItemGroupHeader,
	TimelineItemGroupSeenIndicator,
} from "../../primitives/timeline-item-group";
import { cn } from "../utils";
import { Avatar } from "./avatar";
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
	seenByIds?: readonly string[];
	seenByNames?: readonly string[];
};

const EMPTY_SEEN_BY_IDS: readonly string[] = Object.freeze([]);
const EMPTY_SEEN_BY_NAMES: readonly string[] = Object.freeze([]);

export const TimelineMessageGroup: React.FC<TimelineMessageGroupProps> = ({
	items,
	availableAIAgents,
	availableHumanAgents,
	currentVisitorId,
	seenByIds = EMPTY_SEEN_BY_IDS,
	seenByNames = EMPTY_SEEN_BY_NAMES,
}) => {
	// Get agent info for the sender
	const firstItem = items[0];
	const humanAgent = availableHumanAgents.find(
		(agent) => agent.id === firstItem?.userId
	);
	const aiAgent = availableAIAgents.find(
		(agent) => agent.id === firstItem?.aiAgentId
	);

	if (items.length === 0) {
		return null;
	}

	const hasSeenIndicator = seenByIds.length > 0;

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
								<Avatar
									className="size-6"
									image={aiAgent?.image}
									isAI
									name={aiAgent?.name || "AI Assistant"}
									showBackground={!!aiAgent?.image}
								/>
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
							<TimelineItemGroupHeader className="px-1 text-co-muted-foreground text-xs">
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
												className="px-1 text-co-muted-foreground text-xs"
												seenByIds={seenByIds}
											>
												{() =>
													seenByNames.length > 0
														? `Seen by ${seenByNames.join(", ")}`
														: "Seen"
												}
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

TimelineMessageGroup.displayName = "TimelineMessageGroup";
