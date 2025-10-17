import type {
	AvailableAIAgent,
	AvailableHumanAgent,
	Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { motion } from "motion/react";
import type React from "react";
import { useMemo } from "react";
import {
	MessageGroupAvatar,
	MessageGroupContent,
	MessageGroupHeader,
	MessageGroupSeenIndicator,
	MessageGroup as PrimitiveMessageGroup,
} from "../../primitives/message-group";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { CossistantLogo } from "./cossistant-branding";
import { Message } from "./message";

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
		duration: 0.15,
		ease: "easeOut" as const,
	},
} as const;

export type MessageGroupProps = {
	messages?: MessageType[];
	items?: TimelineItem[]; // New: timeline items
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	currentVisitorId?: string;
	seenByIds?: string[];
};

export const MessageGroup: React.FC<MessageGroupProps> = ({
	messages: legacyMessages,
	items,
	availableAIAgents,
	availableHumanAgents,
	currentVisitorId,
	seenByIds = [],
}) => {
	// Convert timeline items to messages if needed
	const messages = useMemo(() => {
		if (items && items.length > 0) {
			return items.map((item) => ({
				id: item.id || "",
				bodyMd: item.text || "",
				type: "text" as const,
				userId: item.userId,
				visitorId: item.visitorId,
				aiAgentId: item.aiAgentId,
				conversationId: item.conversationId,
				organizationId: item.organizationId,
				websiteId: "", // Not available in timeline item
				parentMessageId: null,
				modelUsed: null,
				visibility: item.visibility,
				createdAt: item.createdAt,
				updatedAt: item.createdAt,
				deletedAt: item.deletedAt,
			})) as MessageType[];
		}
		return legacyMessages || [];
	}, [items, legacyMessages]);

	// Get agent info for the sender
	const firstMessage = messages[0];
	const humanAgent = availableHumanAgents.find(
		(agent) => agent.id === firstMessage?.userId
	);
	const aiAgent = availableAIAgents.find(
		(agent) => agent.id === firstMessage?.aiAgentId
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

	if (messages.length === 0) {
		return null;
	}

	return (
		<PrimitiveMessageGroup
			messages={messages}
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
						<MessageGroupAvatar className="flex flex-shrink-0 flex-col justify-end">
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
						</MessageGroupAvatar>
					)}

					<MessageGroupContent
						className={cn("flex flex-col gap-1", isSentByViewer && "items-end")}
					>
						{/* Header - show sender name for received messages (agents) */}
						{isReceivedByViewer && (
							<MessageGroupHeader className="px-1 text-muted-foreground text-xs">
								{isAI
									? aiAgent?.name || "AI Assistant"
									: humanAgent?.name || "Support"}
							</MessageGroupHeader>
						)}

						{messages.map((message, index) => (
							<motion.div key={message.id} {...MESSAGE_ANIMATION}>
								<Message
									isLast={index === messages.length - 1}
									isSentByViewer={isSentByViewer}
									message={message}
								/>
							</motion.div>
						))}

						{isSentByViewer &&
							seenByIds.length > 0 &&
							seenByNames.length > 0 && (
								<motion.div key="seen-indicator" {...SEEN_ANIMATION}>
									<MessageGroupSeenIndicator
										className="my-4 px-1 text-muted-foreground text-xs"
										seenByIds={seenByIds}
									>
										{() => `Seen by ${seenByNames.join(", ")}`}
									</MessageGroupSeenIndicator>
								</motion.div>
							)}
					</MessageGroupContent>
				</div>
			)}
		</PrimitiveMessageGroup>
	);
};
