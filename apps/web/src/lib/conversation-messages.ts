import { ConversationTimelineType, type TimelineItem } from "@cossistant/types";

export function isInboundVisitorMessage(
        timelineItem: TimelineItem | null | undefined
): timelineItem is TimelineItem {
        return (
                Boolean(timelineItem) &&
                timelineItem.type === ConversationTimelineType.MESSAGE &&
                Boolean(timelineItem.visitorId) &&
                !timelineItem.userId &&
                !timelineItem.aiAgentId
        );
}
