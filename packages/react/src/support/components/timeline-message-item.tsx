import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type React from "react";
import {
  TimelineItem as PrimitiveTimelineItem,
  TimelineItemContent,
  TimelineItemTimestamp,
} from "../../primitives/timeline-item";
import { useSupportText } from "../text";
import { cn } from "../utils";

export type TimelineMessageItemProps = {
  item: TimelineItem;
  isLast?: boolean;
  isSentByViewer?: boolean;
};

export function TimelineMessageItem({
  item,
  isLast = false,
  isSentByViewer,
}: TimelineMessageItemProps) {
  const text = useSupportText();
  return (
    <PrimitiveTimelineItem item={item}>
      {({ isVisitor, isAI, timestamp }) => {
        // Use passed isSentByViewer if provided, otherwise fall back to isVisitor
        const isSentByViewerFinal = isSentByViewer ?? isVisitor;

        return (
          <div
            className={cn(
              "flex w-full gap-2",
              isSentByViewerFinal && "flex-row-reverse",
              !isSentByViewerFinal && "flex-row"
            )}
          >
            <div
              className={cn(
                "flex w-full flex-1 flex-col gap-1",
                isSentByViewerFinal && "items-end"
              )}
            >
              <TimelineItemContent
                className={cn(
                  "block w-max max-w-[300px] rounded-lg px-3.5 py-2.5 text-sm",
                  {
                    "bg-co-background-300 text-foreground dark:bg-co-background-600":
                      !isSentByViewerFinal,
                    "bg-primary text-primary-foreground": isSentByViewerFinal,
                    "rounded-br-sm": isLast && isSentByViewerFinal,
                    "rounded-bl-sm": isLast && !isSentByViewerFinal,
                  }
                )}
                renderMarkdown
                text={item.text}
              />
              {isLast && (
                <TimelineItemTimestamp
                  className="px-1 text-muted-foreground text-xs"
                  timestamp={timestamp}
                >
                  {() => (
                    <>
                      {timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isAI &&
                        ` ${text("component.message.timestamp.aiIndicator")}`}
                    </>
                  )}
                </TimelineItemTimestamp>
              )}
            </div>
          </div>
        );
      }}
    </PrimitiveTimelineItem>
  );
}
