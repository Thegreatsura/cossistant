import {
	TimelineItem as PrimitiveTimelineItem,
	TimelineItemContent,
	TimelineItemTimestamp,
} from "@cossistant/next/primitives";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type React from "react";
import { cn } from "@/lib/utils";

export type TimelineMessageItemProps = {
	item: TimelineItem;
	isLast?: boolean;
	isSentByViewer?: boolean;
};

export function TimelineMessageItem({
	item,
	isLast = false,
	isSentByViewer = false,
}: TimelineMessageItemProps) {
	return (
		<PrimitiveTimelineItem item={item}>
			{({ isAI, timestamp }) => (
				<div
					className={cn(
						"flex w-full gap-2",
						isSentByViewer && "flex-row-reverse",
						!isSentByViewer && "flex-row"
					)}
				>
					<div
						className={cn(
							"flex w-full min-w-0 flex-1 flex-col gap-3",
							isSentByViewer && "items-end"
						)}
					>
						<TimelineItemContent
							className={cn(
								"block w-fit min-w-0 max-w-full whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm md:max-w-[420px]",
								{
									"bg-background-300 text-foreground dark:bg-background-600":
										!isSentByViewer,
									"bg-primary text-primary-foreground": isSentByViewer,
									"rounded-br-[2px]": isLast && isSentByViewer,
									"rounded-bl-[2px]": isLast && !isSentByViewer,
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
										{isAI && " • AI agent"}
									</>
								)}
							</TimelineItemTimestamp>
						)}
					</div>
				</div>
			)}
		</PrimitiveTimelineItem>
	);
}
