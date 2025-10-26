import { type Conversation, ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useConversationPreview } from "../../hooks/use-conversation-preview";
import {
	ConversationButton,
	type ConversationButtonState,
} from "../../primitives/conversation-button";
import { type SupportTextKey, useSupportText } from "../text";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { coButtonVariants } from "./button";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

export type ConversationButtonLinkProps = {
	conversation: Conversation;
	onClick?: () => void;
	className?: string | ((state: ConversationButtonLinkState) => string);
};

type ConversationPreviewData = ReturnType<typeof useConversationPreview>;

export type ConversationButtonLinkAgent =
	ConversationPreviewData["assignedAgent"];

export type ConversationButtonLinkState = ConversationButtonState<{
	conversation: Conversation;
	lastMessage: ConversationPreviewData["lastMessage"];
	typing: ConversationPreviewData["typing"];
	timeline: ConversationPreviewData["timeline"];
	statusKey: ConversationStatus;
	statusBadgeClassName: string;
}>;

const STATUS_BADGE_CLASSNAMES: Record<ConversationStatus, string> = {
	[ConversationStatus.OPEN]: "bg-co-success/20 text-co-success-foreground",
	[ConversationStatus.RESOLVED]: "bg-co-neutral/20 text-co-neutral-foreground",
	[ConversationStatus.SPAM]: "bg-co-warning/20 text-co-warning-foreground",
};

const DEFAULT_STATUS_BADGE_CLASSNAME =
	"bg-co-neutral/20 text-co-neutral-foreground";

const STATUS_TEXT_KEYS: Record<ConversationStatus, SupportTextKey> = {
	[ConversationStatus.OPEN]: "component.conversationButtonLink.status.open",
	[ConversationStatus.RESOLVED]:
		"component.conversationButtonLink.status.resolved",
	[ConversationStatus.SPAM]: "component.conversationButtonLink.status.spam",
};

export function ConversationButtonLink({
	conversation,
	onClick,
	className,
}: ConversationButtonLinkProps): React.ReactElement | null {
	const preview = useConversationPreview({ conversation });
	const text = useSupportText();
	const { lastMessage, assignedAgent, typing } = preview;
	const conversationTitle = preview.title;

	const statusBadgeClassName =
		STATUS_BADGE_CLASSNAMES[conversation.status] ??
		DEFAULT_STATUS_BADGE_CLASSNAME;

	const statusTextKey = STATUS_TEXT_KEYS[conversation.status];
	const statusText = statusTextKey
		? text(statusTextKey)
		: text("common.fallbacks.unknown");

	const lastMessageContent = lastMessage ? (
		lastMessage.isFromVisitor ? (
			<span>
				{text("component.conversationButtonLink.lastMessage.visitor", {
					time: lastMessage.time,
				})}
			</span>
		) : (
			<span>
				{text("component.conversationButtonLink.lastMessage.agent", {
					name: lastMessage.senderName || text("common.fallbacks.supportTeam"),
					time: lastMessage.time,
				})}
			</span>
		)
	) : undefined;

	const state: ConversationButtonLinkState = {
		conversation,
		title: conversationTitle,
		lastMessage,
		lastMessageText: lastMessageContent,
		assignedAgent,
		typing,
		timeline: preview.timeline,
		isTyping: typing.isTyping,
		status: statusText,
		statusKey: conversation.status,
		statusBadgeClassName,
	};

	const baseClassName = cn(
		coButtonVariants({
			variant: "secondary",
			size: "large",
		}),
		"group/btn relative gap-3 border-0 border-co-border/50 border-b text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0"
	);

	const resolvedClassName =
		typeof className === "function"
			? (buttonState: ConversationButtonLinkState) =>
					cn(baseClassName, className(buttonState))
			: cn(baseClassName, className);

	return (
		<ConversationButton<ConversationButtonLinkState>
			assignedAgent={assignedAgent}
			className={resolvedClassName}
			isTyping={typing.isTyping}
			lastMessage={lastMessageContent}
			onClick={onClick}
			state={state}
			status={statusText}
			title={conversationTitle}
		>
			<Avatar
				className="flex size-8 flex-shrink-0 items-center justify-center overflow-clip rounded-full bg-co-background-200 dark:bg-co-background-500"
				image={state.assignedAgent?.image}
				name={state.assignedAgent?.name ?? text("common.fallbacks.supportTeam")}
			/>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{state.isTyping ? (
					<BouncingDots />
				) : (
					<>
						<div className="flex max-w-[90%] items-center justify-between gap-2">
							<h3 className="truncate font-medium text-co-primary text-sm">
								{state.title}
							</h3>
						</div>
						{state.lastMessageText ? (
							<p className="text-co-primary/60 text-xs">
								{state.lastMessageText}
							</p>
						) : null}
					</>
				)}
			</div>

			<div
				className={cn(
					"mr-6 inline-flex items-center rounded px-2 py-0.5 font-medium text-[9px] uppercase",
					state.statusBadgeClassName
				)}
			>
				{state.status}
			</div>

			<Icon
				className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
				name="arrow-right"
				variant="default"
			/>
		</ConversationButton>
	);
}
