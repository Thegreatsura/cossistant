import type {
	AvailableAIAgent,
	AvailableHumanAgent,
	TimelinePartEvent,
} from "@cossistant/types";
import { motion } from "motion/react";
import type React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";

export type ConversationEventProps = {
	event: TimelinePartEvent;
	createdAt?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
};

export const ConversationEvent: React.FC<ConversationEventProps> = ({
	event,
	createdAt,
	availableAIAgents,
	availableHumanAgents,
}) => {
	const isAI = event.actorAiAgentId !== null;
	const humanAgent = availableHumanAgents.find(
		(agent) => agent.id === event.actorUserId
	);
	const aiAgent = availableAIAgents.find(
		(agent) => agent.id === event.actorAiAgentId
	);

	// Get the actor name
	const actorName = isAI
		? aiAgent?.name || "Cossistant"
		: humanAgent?.name || "Someone";

	// Convert event type to plain English
	const getEventText = () => {
		switch (event.eventType) {
			case "assigned":
				return `${actorName} assigned the conversation`;
			case "unassigned":
				return `${actorName} unassigned the conversation`;
			case "participant_requested":
				return `${actorName} requested to join`;
			case "participant_joined":
				return `${actorName} joined the conversation`;
			case "participant_left":
				return `${actorName} left the conversation`;
			case "status_changed":
				return `${actorName} changed the status`;
			case "priority_changed":
				return `${actorName} changed the priority`;
			case "tag_added":
				return `${actorName} added a tag`;
			case "tag_removed":
				return `${actorName} removed a tag`;
			case "resolved":
				return `${actorName} resolved the conversation`;
			case "reopened":
				return `${actorName} reopened the conversation`;
			case "visitor_blocked":
				return `${actorName} blocked the visitor`;
			case "visitor_unblocked":
				return `${actorName} unblocked the visitor`;
			default:
				return `${actorName} performed an action`;
		}
	};

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className="flex items-center justify-center py-4"
			initial={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				<div className="flex flex-col justify-end">
					{isAI ? (
						<div className="flex size-5 items-center justify-center rounded-sm bg-primary/10">
							<Logo className="h-3 w-3 text-primary" />
						</div>
					) : (
						<Avatar
							className="size-5 shrink-0 overflow-clip"
							fallbackName={humanAgent?.name ?? "Someone"}
							url={humanAgent?.image}
						/>
					)}
				</div>
				<span className="px-1">{getEventText()}</span>
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
