import type {
AvailableAIAgent,
AvailableHumanAgent,
Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import { motion } from "motion/react";
import React, { useMemo } from "react";
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

export type MessageGroupProps = {
messages: MessageType[];
availableAIAgents: AvailableAIAgent[];
availableHumanAgents: AvailableHumanAgent[];
currentVisitorId?: string;
seenByIds?: string[];
};

export const MessageGroup: React.FC<MessageGroupProps> = ({
        messages,
        availableAIAgents,
        availableHumanAgents,
        currentVisitorId,
        seenByIds = [],
}) => {
        if (messages.length === 0) {
                return null;
        }

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
                        if (human && human.name) {
                                deduped.add(human.name);
                                continue;
                        }
                        const ai = availableAIAgents.find((agent) => agent.id === id);
                        if (ai && ai.name) {
                                deduped.add(ai.name);
                                continue;
                        }
                }
                return Array.from(deduped);
        }, [seenByIds, availableHumanAgents, availableAIAgents]);

        return (
                <PrimitiveMessageGroup
                        messages={messages}
                        viewerId={currentVisitorId}
                        viewerType={SenderType.VISITOR}
                        seenByIds={seenByIds}
                >
                        {({
                                isSentByViewer,
                                isReceivedByViewer,
                                isVisitor,
				isAI,
				isTeamMember,
			}) => (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className={cn(
						"flex w-full gap-2",
						// Support widget POV: visitor messages are sent (right side)
						// Agent messages are received (left side)
						isSentByViewer && "flex-row-reverse",
						isReceivedByViewer && "flex-row"
					)}
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
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
							<Message
								isLast={index === messages.length - 1}
								isSentByViewer={isSentByViewer}
								key={message.id}
								message={message}
							/>
                                                ))}

                                                {isSentByViewer && seenByIds.length > 0 ? (
                                                        <MessageGroupSeenIndicator
                                                                className="px-1 text-muted-foreground text-xs"
                                                                seenByIds={seenByIds}
                                                        >
                                                                {() =>
                                                                        seenByNames.length > 0
                                                                                ? `Seen by ${seenByNames.join(", ")}`
                                                                                : "Seen"
                                                                }
                                                        </MessageGroupSeenIndicator>
                                                ) : null}
                                        </MessageGroupContent>
                                </motion.div>
                        )}
                </PrimitiveMessageGroup>
        );
};
