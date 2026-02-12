import type {
	AvailableAIAgent,
	AvailableHumanAgent,
	TimelinePartEvent,
} from "@cossistant/types";
import { motion } from "motion/react";
import type React from "react";
import { useSupportText } from "../text";
import { cn } from "../utils";
import { Avatar } from "./avatar";

export type ConversationEventProps = {
	event: TimelinePartEvent;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	createdAt?: string;
	compact?: boolean;
	showAvatar?: boolean;
	className?: string;
};

export const ConversationEvent: React.FC<ConversationEventProps> = ({
	event,
	availableAIAgents,
	createdAt,
	availableHumanAgents,
	compact = false,
	showAvatar = true,
	className,
}) => {
	const text = useSupportText();
	const isAI = event.actorAiAgentId !== null;
	const humanAgent = availableHumanAgents.find(
		(agent) => agent.id === event.actorUserId
	);
	const aiAgent = availableAIAgents.find(
		(agent) => agent.id === event.actorAiAgentId
	);

	// Get the actor name
	const actorName = isAI
		? aiAgent?.name || text("common.fallbacks.cossistant")
		: humanAgent?.name || text("common.fallbacks.someone");

	// Convert event type to plain English
	const getEventText = () => {
		switch (event.eventType) {
			case "assigned":
				return text("component.conversationEvent.assigned", {
					actorName,
				});
			case "unassigned":
				return text("component.conversationEvent.unassigned", {
					actorName,
				});
			case "participant_requested":
				return text("component.conversationEvent.participantRequested", {
					actorName,
				});
			case "participant_joined":
				return text("component.conversationEvent.participantJoined", {
					actorName,
				});
			case "participant_left":
				return text("component.conversationEvent.participantLeft", {
					actorName,
				});
			case "status_changed":
				return text("component.conversationEvent.statusChanged", {
					actorName,
				});
			case "priority_changed":
				return text("component.conversationEvent.priorityChanged", {
					actorName,
				});
			case "tag_added":
				return text("component.conversationEvent.tagAdded", {
					actorName,
				});
			case "tag_removed":
				return text("component.conversationEvent.tagRemoved", {
					actorName,
				});
			case "resolved":
				return text("component.conversationEvent.resolved", {
					actorName,
				});
			case "reopened":
				return text("component.conversationEvent.reopened", {
					actorName,
				});
			case "visitor_blocked":
				return text("component.conversationEvent.visitorBlocked", {
					actorName,
				});
			case "visitor_unblocked":
				return text("component.conversationEvent.visitorUnblocked", {
					actorName,
				});
			case "visitor_identified":
				return text("component.conversationEvent.visitorIdentified", {
					actorName,
				});
			default:
				return text("component.conversationEvent.default", {
					actorName,
				});
		}
	};

	const avatarContent = isAI ? (
		<Avatar
			className="size-6 flex-shrink-0"
			image={aiAgent?.image}
			isAI
			name={aiAgent?.name || text("common.fallbacks.cossistant")}
			showBackground={!!aiAgent?.image}
		/>
	) : (
		<Avatar
			className="size-6 flex-shrink-0"
			image={humanAgent?.image}
			name={humanAgent?.name || text("common.fallbacks.someone")}
		/>
	);

	if (compact) {
		return (
			<motion.div
				animate={{ opacity: 1, scale: 1 }}
				className={cn(
					"flex items-center gap-2 text-co-muted-foreground text-sm",
					className
				)}
				initial={{ opacity: 0, scale: 0.95 }}
				transition={{ duration: 0.3, ease: "easeOut" }}
			>
				{showAvatar ? avatarContent : null}
				<span className="break-words">{getEventText()}</span>
				{createdAt ? (
					<time className="text-[10px]">
						{new Date(createdAt).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</time>
				) : null}
			</motion.div>
		);
	}

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className={cn("flex items-center pt-4 pb-8", className)}
			initial={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			<div className="flex items-center gap-2 text-co-muted-foreground text-sm">
				{showAvatar ? (
					<div className="flex flex-col justify-end">{avatarContent}</div>
				) : null}
				<span className="px-2">{getEventText()}</span>
				{createdAt && (
					<time className="text-[10px]">
						{new Date(createdAt).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</time>
				)}
			</div>
		</motion.div>
	);
};

ConversationEvent.displayName = "ConversationEvent";
