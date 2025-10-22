import { type Conversation, ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useConversationPreview } from "../../hooks/use-conversation-preview";
import { useRenderElement } from "../../utils/use-render-element";
import { useSupportText } from "../text";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { coButtonVariants } from "./button";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

export type ConversationButtonLinkProps = {
	conversation: Conversation;
	onClick?: () => void;
	className?: string | ((state: ConversationButtonLinkState) => string);
	render?: (
		props: React.HTMLProps<HTMLButtonElement>,
		state: ConversationButtonLinkState
	) => React.ReactElement;
};

type ConversationPreviewData = ReturnType<typeof useConversationPreview>;

export type ConversationButtonLinkAgent =
	ConversationPreviewData["assignedAgent"];

export type ConversationButtonLinkState = {
	conversation: Conversation;
	title: ConversationPreviewData["title"];
	lastMessage: ConversationPreviewData["lastMessage"];
	assignedAgent: ConversationPreviewData["assignedAgent"];
	typing: ConversationPreviewData["typing"];
	timeline: ConversationPreviewData["timeline"];
};

export function ConversationButtonLink({
	conversation,
	onClick,
	...props
}: ConversationButtonLinkProps) {
	const preview = useConversationPreview({ conversation });
	const text = useSupportText();
	const { lastMessage, assignedAgent, typing } = preview;
	const conversationTitle = preview.title;

	const state: ConversationButtonLinkState = {
		conversation,
		title: preview.title,
		lastMessage,
		assignedAgent,
		typing,
		timeline: preview.timeline,
	};

	return useRenderElement("button", props, {
		state,
		props: {
			onClick,
			type: "button",
			className: cn(
				coButtonVariants({
					variant: "secondary",
					size: "large",
				}),
				"relative gap-3 border-0 border-co-border/50 border-b text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0",
				typeof props.className === "function"
					? props.className(state)
					: props.className
			),
			children: (
				<>
					<Avatar
						className="size-8 flex-shrink-0"
						image={assignedAgent.image}
						name={assignedAgent.name}
					/>

					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						{typing.isTyping ? (
							<BouncingDots />
						) : (
							<>
								<div className="flex max-w-[90%] items-center justify-between gap-2">
									<h3 className="truncate font-medium text-co-primary text-sm">
										{conversationTitle}
									</h3>
								</div>

								{lastMessage ? (
									<p className="text-co-primary/60 text-xs">
										{lastMessage.isFromVisitor ? (
											<span>
												{text(
													"component.conversationButtonLink.lastMessage.visitor",
													{
														time: lastMessage.time,
													}
												)}
											</span>
										) : (
											<span>
												{text(
													"component.conversationButtonLink.lastMessage.agent",
													{
														name:
															lastMessage.senderName ||
															text("common.fallbacks.supportTeam"),
														time: lastMessage.time,
													}
												)}
											</span>
										)}
									</p>
								) : null}
							</>
						)}
					</div>
					<div
						className={cn(
							"mr-6 inline-flex items-center rounded px-2 py-0.5 font-medium text-[9px] uppercase",
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
