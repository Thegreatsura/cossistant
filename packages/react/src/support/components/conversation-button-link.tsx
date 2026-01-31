import { type Conversation, ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useConversationPreview } from "../../hooks/use-conversation-preview";
import { type SupportTextKey, useSupportText } from "../text";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { coButtonVariants } from "./button";
import Icon from "./icons";
import { BouncingDots } from "./typing-indicator";

export type ConversationButtonLinkProps = {
	conversation: Conversation;
	onClick?: () => void;
	className?: string;
};

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

/**
 * Renders a navigable preview card for a conversation including assigned agent
 * details, last message snippets and typing indicators.
 */
export function ConversationButtonLink({
	conversation,
	onClick,
	className,
}: ConversationButtonLinkProps): React.ReactElement | null {
	const preview = useConversationPreview({ conversation });
	const text = useSupportText();
	const { lastMessage, assignedAgent, typing } = preview;

	const statusBadgeClassName = conversation.deletedAt
		? STATUS_BADGE_CLASSNAMES[ConversationStatus.RESOLVED]
		: (STATUS_BADGE_CLASSNAMES[conversation.status] ??
			DEFAULT_STATUS_BADGE_CLASSNAME);

	const statusTextKey = conversation.deletedAt
		? STATUS_TEXT_KEYS[ConversationStatus.RESOLVED]
		: STATUS_TEXT_KEYS[conversation.status];

	const statusText = conversation.deletedAt
		? text("component.conversationButtonLink.status.closed")
		: statusTextKey
			? text(statusTextKey)
			: text("common.fallbacks.unknown");

	// Show the actual title if it exists, otherwise use the preview title (which may fallback to message)
	const displayTitle = conversation.title || preview.title;

	// Show the truncated message content as secondary text
	const messagePreview = lastMessage?.content || null;

	return (
		<button
			className={cn(
				coButtonVariants({
					variant: "secondary",
					size: "large",
				}),
				"group/btn relative gap-2 border-0 border-co-border/50 border-b pr-3 pl-3 text-left transition-colors first-of-type:rounded-t last-of-type:rounded-b last-of-type:border-b-0 has-[>svg]:pl-3",
				className
			)}
			onClick={onClick}
			type="button"
		>
			<Avatar
				className="size-8 flex-shrink-0"
				image={assignedAgent?.image}
				isAI={assignedAgent?.type === "ai"}
				lastSeenAt={assignedAgent?.lastSeenAt}
				name={assignedAgent?.name ?? text("common.fallbacks.supportTeam")}
			/>

			<div className="mr-6 ml-1 flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex max-w-[90%] items-center justify-between gap-2">
					<h3 className="truncate font-medium text-co-primary text-sm">
						{displayTitle}
					</h3>
				</div>
				{typing.isTyping ? (
					<BouncingDots />
				) : messagePreview ? (
					<p className="truncate text-co-primary/60 text-sm">
						{messagePreview}
					</p>
				) : null}
			</div>

			{/* <div
        className={cn(
          "mr-6 inline-flex items-center rounded px-2 py-0.5 font-medium text-[9px] uppercase",
          statusBadgeClassName,
        )}
      >
        {statusText}
      </div> */}

			<Icon
				className="-translate-y-1/2 absolute top-1/2 right-4 size-3 text-co-primary/60 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-co-primary"
				name="arrow-right"
				variant="default"
			/>
		</button>
	);
}
