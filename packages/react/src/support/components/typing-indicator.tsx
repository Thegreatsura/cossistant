import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import * as React from "react";
import { cn } from "../utils";
import { Avatar } from "./avatar";

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

export const BouncingDots = ({
	className,
}: {
	className?: string;
}): React.ReactElement => (
	<div className="flex gap-1">
		<span
			className={cn(
				"dot-bounce-1 size-1 rounded-full bg-co-primary",
				className
			)}
		/>
		<span
			className={cn(
				"dot-bounce-2 size-1 rounded-full bg-co-primary",
				className
			)}
		/>
		<span
			className={cn(
				"dot-bounce-3 size-1 rounded-full bg-co-primary",
				className
			)}
		/>
	</div>
);

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
		ref
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
			humanParticipantIds.includes(agent.id)
		);

		const typingAIAgents = availableAIAgents.filter((agent) =>
			aiParticipantIds.includes(agent.id)
		);

		return (
			<div
				className={cn("flex items-center gap-6", className)}
				ref={ref}
				{...props}
			>
				{withAvatars && (
					<div className="flex items-center">
						{typingAIAgents.map((agent) => (
							<Avatar
								className="size-6"
								image={agent.image}
								isAI
								key={agent.id}
								name={agent.name}
								showBackground={!!agent.image}
							/>
						))}
						{typingHumanAgents.map((agent) => (
							<Avatar
								className="size-6"
								image={agent.image}
								key={agent.id}
								lastSeenAt={agent.lastSeenAt}
								name={agent.name}
							/>
						))}
					</div>
				)}
				<BouncingDots />
			</div>
		);
	}
);

TypingIndicator.displayName = "TypingIndicator";
