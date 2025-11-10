import { generateMessageId } from "@cossistant/core";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useMemo } from "react";
import { useSupport } from "../../provider";

type UseDefaultMessagesParams = {
	conversationId: string;
};

/**
 * Mirrors the provider-configured default messages into timeline items so
 * that welcome content renders immediately while the backend conversation is
 * still being created. Agent fallbacks are resolved against available humans
 * and AI agents exposed by the provider context.
 */
export function useDefaultMessages({
	conversationId,
}: UseDefaultMessagesParams): TimelineItem[] {
	const { defaultMessages, availableAIAgents, availableHumanAgents } =
		useSupport();

	const memoisedDefaultTimelineItems = useMemo(
		() =>
			defaultMessages.map((message, index) => {
				const messageId = generateMessageId();
				const timestamp =
					typeof window !== "undefined" ? new Date().toISOString() : "";

				return {
					id: messageId,
					conversationId,
					organizationId: "", // Not available for default messages
					type: "message" as const,
					text: message.content,
					parts: [{ type: "text" as const, text: message.content }],
					visibility: "public" as const,
					userId:
						message.senderType === SenderType.TEAM_MEMBER
							? message.senderId || availableHumanAgents[0]?.id || null
							: null,
					aiAgentId:
						message.senderType === SenderType.AI
							? message.senderId || availableAIAgents[0]?.id || null
							: null,
					visitorId:
						message.senderType === SenderType.VISITOR
							? message.senderId || null
							: null,
					createdAt: timestamp,
					deletedAt: null,
				} satisfies TimelineItem;
			}),
		[
			defaultMessages,
			availableHumanAgents[0]?.id,
			availableAIAgents[0]?.id,
			conversationId,
		]
	);

	return memoisedDefaultTimelineItems;
}
