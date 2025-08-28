import { type Conversation, ConversationStatus } from "@cossistant/types";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useMemo } from "react";
import { useSupport } from "../..";
import { useRenderElement } from "../../utils/use-render-element";
import { cn } from "../utils";
import {
	getAllMessagesFromCache,
	type PaginatedMessagesCache,
} from "../utils/message-cache";
import { QUERY_KEYS } from "../utils/query-keys";
import { formatTimeAgo } from "../utils/time";
import { Avatar } from "./avatar";
import Icon from "./icons";

export interface ConversationButtonLinkProps {
	conversation: Conversation;
	onClick?: () => void;
	className?: string | ((state: ConversationButtonLinkState) => string);
	render?: (
		props: React.HTMLProps<HTMLButtonElement>,
		state: ConversationButtonLinkState
	) => React.ReactElement;
}

export interface ConversationButtonLinkState {
	conversation: Conversation;
	lastMessage: {
		content: string;
		time: string;
		isFromVisitor: boolean;
		senderName?: string;
		senderImage?: string | null;
	} | null;
}

function getLastMessageInfo(
	message: NonNullable<Conversation["lastMessage"]>,
	availableHumanAgents: ReturnType<typeof useSupport>["availableHumanAgents"],
	website: ReturnType<typeof useSupport>["website"]
) {
	const isFromVisitor = message.visitorId !== null;

	// Find the sender information
	let senderName = "Unknown";
	let senderImage: string | null = null;

	if (isFromVisitor) {
		senderName = "You";
	} else if (message.userId) {
		// Find the human agent
		const agent = availableHumanAgents.find((a) => a.id === message.userId);
		if (agent) {
			senderName = agent.name;
			senderImage = agent.image;
		}
	} else if (message.aiAgentId && website?.availableAIAgents) {
		// Find the AI agent
		const aiAgent = website.availableAIAgents.find(
			(a) => a.id === message.aiAgentId
		);
		if (aiAgent) {
			senderName = aiAgent.name;
			senderImage = aiAgent.image;
		}
	}

	return {
		content: message.bodyMd,
		time: formatTimeAgo(message.createdAt),
		isFromVisitor,
		senderName,
		senderImage,
	};
}

export function ConversationButtonLink({
	conversation,
	onClick,
	...props
}: ConversationButtonLinkProps) {
	const { availableHumanAgents, website } = useSupport();
	const queryClient = useQueryClient();

	// Process the last message (memoized to avoid expensive recomputation)
	const lastMessage = useMemo(() => {
		// Check for cached messages for this conversation
		const cachedMessages = queryClient.getQueryData<PaginatedMessagesCache>(
			QUERY_KEYS.messages(conversation.id)
		);
		const allMessages = getAllMessagesFromCache(cachedMessages);
		const cachedLastMessage =
			// biome-ignore lint/style/useAtIndex: ok here
			allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

		// Use cached message if available, otherwise use conversation's lastMessage
		const messageToDisplay = cachedLastMessage || conversation.lastMessage;

		return messageToDisplay
			? getLastMessageInfo(messageToDisplay, availableHumanAgents, website)
			: null;
	}, [
		queryClient,
		conversation.id,
		conversation.lastMessage,
		availableHumanAgents,
		website,
	]);

	const state: ConversationButtonLinkState = {
		conversation,
		lastMessage,
	};

	return useRenderElement("button", props, {
		state,
		props: {
			onClick,
			type: "button",
			className: cn(
				"group/btn relative flex w-full items-center gap-2 rounded-none border-0 border-co-border/50 border-b bg-co-background-100/50 px-4 py-3 text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0 hover:cursor-pointer hover:bg-co-background-100 hover:text-co-foreground dark:bg-co-background-300 dark:hover:bg-co-background-400",
				typeof props.className === "function"
					? props.className(state)
					: props.className
			),
			children: (
				<>
					{lastMessage && !lastMessage.isFromVisitor && (
						<Avatar
							className="size-8 flex-shrink-0"
							image={lastMessage.senderImage}
							name={lastMessage.senderName || "Agent"}
						/>
					)}

					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<div className="flex max-w-[90%] items-center justify-between gap-2">
							<h3 className="truncate font-medium text-co-primary text-sm">
								{conversation.title ||
									lastMessage?.content ||
									"Untitled conversation"}
							</h3>
						</div>

						{lastMessage && (
							<p className="text-co-primary/60 text-xs">
								{lastMessage.isFromVisitor ? (
									<span>You - {lastMessage.time}</span>
								) : (
									<span>
										{lastMessage.senderName} - {lastMessage.time}
									</span>
								)}
							</p>
						)}
					</div>
					<div
						className={cn(
							"mr-6 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[9px] uppercase",
							conversation.status === ConversationStatus.OPEN
								? "bg-co-success/20 text-co-success-foreground"
								: conversation.status === ConversationStatus.RESOLVED
									? "bg-co-neutral/20 text-co-neutral-foreground"
									: "bg-co-warning/20 text-co-warning-foreground"
						)}
					>
						{conversation.status}
					</div>
					<Icon
						className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
						name="arrow-right"
						variant="default"
					/>
				</>
			),
		},
	});
}
