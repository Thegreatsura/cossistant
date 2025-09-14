import {
	MessageGroupAvatar,
	MessageGroupContent,
	MessageGroupHeader,
	MessageGroup as PrimitiveMessageGroup,
} from "@cossistant/react/primitive/message-group";
import type {
	AvailableAIAgent,
	AvailableHumanAgent,
	Message as MessageType,
} from "@cossistant/types";
import { motion } from "motion/react";
import type React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { Message } from "./message";

type Props = {
	messages: MessageType[];
	availableAIAgents: AvailableAIAgent[];
	availableHumanAgents: AvailableHumanAgent[];
};

export function MessageGroup({
	messages,
	availableAIAgents,
	availableHumanAgents,
}: Props) {
	if (messages.length === 0) {
		return null;
	}

	const humanAgent = availableHumanAgents.find(
		(agent) => agent.id === messages[0]?.userId,
	);

	return (
		<PrimitiveMessageGroup messages={messages}>
			{({ isVisitor, isAI }) => (
				<div
					className={cn(
						"flex w-full gap-2 px-2",
						isVisitor && "flex-row-reverse",
						!isVisitor && "flex-row",
					)}
				>
					{!isVisitor && (
						<MessageGroupAvatar className="flex flex-shrink-0 flex-col justify-end">
							{isAI ? (
								<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
									<Logo className="h-5 w-5 text-primary" />
								</div>
							) : (
								<Avatar
									className="size-6"
									url={humanAgent?.image}
									fallbackName={humanAgent?.name || "Support"}
									lastOnlineAt={humanAgent?.lastSeenAt}
								/>
							)}
						</MessageGroupAvatar>
					)}

					<MessageGroupContent
						className={cn("flex flex-col gap-1", isVisitor && "items-end")}
					>
						{!isVisitor && (humanAgent?.name || isAI) && (
							<MessageGroupHeader className="px-1 text-muted-foreground text-xs">
								{isAI ? "Cossistant AI" : humanAgent?.name}
							</MessageGroupHeader>
						)}

						{messages.map((message, index) => (
							<Message
								isLast={index === messages.length - 1}
								key={message.id}
								message={message}
							/>
						))}
					</MessageGroupContent>
				</div>
			)}
		</PrimitiveMessageGroup>
	);
}
