import type { RouterOutputs } from "@api/trpc/types";
import { useGroupedMessages } from "@cossistant/next/hooks/use-grouped-messages";
import {
	MessageListContainer,
	MessageList as PrimitiveMessageList,
} from "@cossistant/next/primitives";
import type {
	AvailableAIAgent,
	ConversationEvent as ConversationEventType,
	Message as MessageType,
} from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { useMemo } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { cn } from "@/lib/utils";
import { ConversationEvent } from "./event";
import { MessageGroup } from "./group";

type Props = {
	ref?: React.RefObject<HTMLDivElement | null>;
	messages: MessageType[];
	events: ConversationEventType[];
	teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
	availableAIAgents: AvailableAIAgent[];
	seenData?: ConversationSeen[];
	visitor: ConversationHeader["visitor"];
	currentUserId: string;
	className?: string;
	onFetchMoreIfNeeded?: () => void;
};

export function MessagesList({
	ref,
	messages = [],
	events = [],
	teamMembers = [],
	availableAIAgents = [],
	seenData = [],
	currentUserId,
	className,
	onFetchMoreIfNeeded,
	visitor,
}: Props) {
	const {
		items,
		lastReadMessageMap,
		getLastReadMessageId,
		isMessageSeenByViewer,
	} = useGroupedMessages({
		messages,
		events,
		seenData,
		currentViewerId: currentUserId,
		viewerType: SenderType.TEAM_MEMBER,
	});

	const availableHumanAgents = useMemo(
		() =>
			teamMembers.map((member) => ({
				id: member.id,
				name: member.name || member.email.split("@")[0] || "Unknown member",
				image: member.image,
				lastSeenAt: member.lastSeenAt,
			})),
		[teamMembers]
	);

	return (
		<PrimitiveMessageList
			autoScroll={true}
			className={cn(
				"overflow-y-auto scroll-smooth pt-20 pr-[5px] pb-48 pl-4",
				"scrollbar-thin scrollbar-thumb-background-300 scrollbar-track-transparent",
				"h-full w-full",
				className
			)}
			events={events}
			id="message-list"
			messages={messages}
			onScrollStart={onFetchMoreIfNeeded}
			ref={ref}
		>
			<div className="mx-auto xl:max-w-xl 2xl:max-w-2xl">
				<MessageListContainer className="flex min-h-full w-full flex-col gap-3">
					{items.map((item, index) => {
						if (item.type === "event") {
							return (
								<ConversationEvent
									availableAIAgents={availableAIAgents}
									availableHumanAgents={availableHumanAgents}
									event={item.event}
									key={item.event.id}
								/>
							);
						}
						return (
							<MessageGroup
								availableAIAgents={availableAIAgents}
								currentUserId={currentUserId}
								key={`group-${index}`}
								lastReadMessageIds={lastReadMessageMap}
								messages={item.messages}
								teamMembers={teamMembers}
								visitor={visitor}
							/>
						);
					})}
					{/* {isTyping && (
          <TypingIndicator
            isAI={isTyping.type === SenderType.AI}
            senderImage={availableAgents[0]?.image || undefined}
            senderName={availableAgents[0]?.name || "Support"}
          />
          )} */}
				</MessageListContainer>
			</div>
		</PrimitiveMessageList>
	);
}
