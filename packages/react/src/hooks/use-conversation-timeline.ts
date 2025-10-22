import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useMemo } from "react";

import { SenderType } from "@cossistant/types";

import { useDebouncedConversationSeen } from "./use-conversation-seen";
import { useConversationTyping } from "./use-conversation-typing";
import { useGroupedMessages } from "./private/use-grouped-messages";

export type ConversationTimelineTypingParticipant = {
	id: string;
	type: "team_member" | "ai";
};

export type UseConversationTimelineOptions = {
	conversationId: string;
	items: TimelineItem[];
	currentVisitorId?: string;
};

export type UseConversationTimelineReturn = {
	groupedMessages: ReturnType<typeof useGroupedMessages>;
	seenData: ReturnType<typeof useDebouncedConversationSeen>;
	typingEntries: ReturnType<typeof useConversationTyping>;
	typingParticipants: ConversationTimelineTypingParticipant[];
	lastVisitorMessageGroupIndex: number;
};

export function useConversationTimeline({
	conversationId,
	items: timelineItems,
	currentVisitorId,
}: UseConversationTimelineOptions): UseConversationTimelineReturn {
	const seenData = useDebouncedConversationSeen(conversationId);
	const typingEntries = useConversationTyping(conversationId, {
		excludeVisitorId: currentVisitorId ?? null,
	});

	const groupedMessages = useGroupedMessages({
		items: timelineItems,
		seenData,
		currentViewerId: currentVisitorId,
		viewerType: SenderType.VISITOR,
	});

	const lastVisitorMessageGroupIndex = useMemo(() => {
		for (
			let index = groupedMessages.items.length - 1;
			index >= 0;
			index--
		) {
			const item = groupedMessages.items[index];

			if (!item || item.type !== "message_group") {
				continue;
			}

			const firstMessage = item.items?.[0];
			if (firstMessage?.visitorId === currentVisitorId) {
				return index;
			}
		}

		return -1;
	}, [groupedMessages.items, currentVisitorId]);

	const typingParticipants = useMemo(
		() =>
			typingEntries
				.map<ConversationTimelineTypingParticipant | null>(
					(entry) => {
						if (
							entry.actorType ===
							"user"
						) {
							return {
								id: entry.actorId,
								type: "team_member",
							};
						}

						if (
							entry.actorType ===
							"ai_agent"
						) {
							return {
								id: entry.actorId,
								type: "ai",
							};
						}

						return null;
					},
				)
				.filter(
					(
						participant,
					): participant is ConversationTimelineTypingParticipant =>
						participant !== null,
				),
		[typingEntries],
	);

	return {
		groupedMessages,
		seenData,
		typingEntries,
		typingParticipants,
		lastVisitorMessageGroupIndex,
	};
}
