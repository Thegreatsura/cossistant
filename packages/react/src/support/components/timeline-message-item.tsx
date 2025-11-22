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

/**
 * Message bubble renderer that adapts layout depending on whether the visitor
 * or an agent sent the message.
 */
export function TimelineMessageItem({
	item,
	isLast = false,
	isSentByViewer = false,
}: TimelineMessageItemProps): React.ReactElement {
	const text = useSupportText();
	return (
		<PrimitiveTimelineItem item={item}>
			{({ isAI, timestamp }) => {
				// isSentByViewer defaults to false, meaning messages are treated as received
				// (left side with background) unless explicitly marked as sent by viewer
				const isSentByViewerFinal = isSentByViewer;

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
								"flex w-full min-w-0 flex-1 flex-col gap-1",
								isSentByViewerFinal && "items-end"
							)}
						>
                                                        <TimelineItemContent
                                                                className={cn(
                                                                        "block min-w-0 max-w-[300px] break-words whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm",
                                                                        {
                                                                                "bg-co-background-300 text-co-foreground dark:bg-co-background-600":
                                                                                        !isSentByViewerFinal,
                                                                                "bg-co-primary text-co-primary-foreground":
                                                                                        isSentByViewerFinal,
                                                                                "rounded-br-sm": isLast && isSentByViewerFinal,
                                                                                "rounded-bl-sm": isLast && !isSentByViewerFinal,
                                                                        }
                                                                )}
                                                                renderMarkdown
                                                                text={item.text}
                                                        />
							{isLast && (
								<TimelineItemTimestamp
									className="px-1 text-co-muted-foreground text-xs"
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
