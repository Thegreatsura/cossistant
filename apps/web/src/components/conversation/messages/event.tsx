import type { RouterOutputs } from "@api/trpc/types";
import type {
	AvailableAIAgent,
	AvailableHumanAgent,
	TimelinePartEvent,
} from "@cossistant/types";
import { motion } from "motion/react";
import type React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { buildTimelineEventDisplay } from "@/lib/timeline-events";

export type ConversationEventProps = {
	event: TimelinePartEvent;
	createdAt?: string;
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
	visitor?: RouterOutputs["conversation"]["getVisitorById"] | null;
};

export const ConversationEvent: React.FC<ConversationEventProps> = ({
	event,
	createdAt,
	availableAIAgents,
	availableHumanAgents,
	visitor,
}) => {
	const display = buildTimelineEventDisplay({
		event,
		availableAIAgents,
		availableHumanAgents,
		visitor,
	});

	const isVisitorIdentifiedEvent = display.avatarType === "visitor";

	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className="flex items-center justify-center py-3"
			initial={{ opacity: 0, scale: 0.95 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
		>
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				<div className="flex flex-col justify-end">
					{isVisitorIdentifiedEvent ? (
						<Avatar
							className="size-5 shrink-0 overflow-clip"
							fallbackName={display.avatarFallbackName}
							url={display.avatarImage}
							withBoringAvatar
						/>
					) : display.avatarType === "ai" ? (
						<div className="flex size-5 items-center justify-center rounded-sm bg-primary/10">
							<Logo className="h-3 w-3 text-primary" />
						</div>
					) : (
						<Avatar
							className="size-5 shrink-0 overflow-clip"
							fallbackName={display.avatarFallbackName}
							url={display.avatarImage}
						/>
					)}
				</div>
				<span className="px-1">
					<span className="font-semibold">{display.actorName}</span>{" "}
					{display.actionText}
				</span>
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
