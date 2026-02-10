import type { RouterOutputs } from "@api/trpc/types";
import type { GroupedActivity } from "@cossistant/next/hooks";
import {
	TimelineItemGroup as PrimitiveTimelineItemGroup,
	TimelineItemGroupAvatar,
	TimelineItemGroupContent,
} from "@cossistant/next/primitives";
import type { AvailableAIAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type {
	TimelineItem,
	TimelinePartEvent,
} from "@cossistant/types/api/timeline-item";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import type { ConversationHeader } from "@/contexts/inboxes";
import { extractEventPart } from "@/lib/timeline-events";
import { shouldDisplayToolTimelineItem } from "@/lib/tool-timeline-visibility";
import { cn } from "@/lib/utils";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import {
	renderEventActionIcon,
	renderToolActionIcon,
} from "./activity/action-icon-map";
import { ConversationEvent } from "./event";
import { ToolCall } from "./tool-call";

type TimelineActivityGroupProps = {
	group: GroupedActivity;
	availableAIAgents: AvailableAIAgent[];
	teamMembers: RouterOutputs["user"]["getWebsiteMembers"];
	currentUserId?: string;
	visitor: ConversationHeader["visitor"];
	isDeveloperModeEnabled: boolean;
};

type ActivityRow =
	| {
			type: "event";
			key: string;
			item: TimelineItem;
			event: TimelinePartEvent;
	  }
	| {
			type: "tool";
			key: string;
			item: TimelineItem;
			toolName: string | null;
	  };

function getToolNameFromTimelineItem(item: TimelineItem): string | null {
	if (typeof item.tool === "string" && item.tool.length > 0) {
		return item.tool;
	}

	for (const part of item.parts) {
		if (
			typeof part === "object" &&
			part !== null &&
			"type" in part &&
			"toolName" in part &&
			typeof part.type === "string" &&
			part.type.startsWith("tool-") &&
			typeof part.toolName === "string"
		) {
			return part.toolName;
		}
	}

	return null;
}

export function TimelineActivityGroup({
	group,
	availableAIAgents,
	teamMembers,
	currentUserId,
	visitor,
	isDeveloperModeEnabled,
}: TimelineActivityGroupProps) {
	const availableHumanAgents = useMemo(
		() =>
			teamMembers.map((member) => ({
				id: member.id,
				name: member.name ?? member.email?.split("@")[0] ?? "Unknown member",
				image: member.image,
				lastSeenAt: member.lastSeenAt,
			})),
		[teamMembers]
	);

	const humanAgent = teamMembers.find((agent) => agent.id === group.senderId);
	const visitorName = getVisitorNameWithFallback(visitor);

	const activityRows = useMemo(() => {
		const rows: ActivityRow[] = [];

		for (let index = 0; index < group.items.length; index++) {
			const item = group.items[index];
			if (!item) {
				continue;
			}

			if (item.type === "event") {
				const eventPart = extractEventPart(item);
				if (!eventPart) {
					continue;
				}

				rows.push({
					type: "event",
					key: item.id ?? `activity-event-${item.createdAt}-${index}`,
					item,
					event: eventPart,
				});
				continue;
			}

			if (item.type === "tool") {
				if (
					!shouldDisplayToolTimelineItem(item, {
						includeInternalLogs: isDeveloperModeEnabled,
					})
				) {
					continue;
				}

				rows.push({
					type: "tool",
					key: item.id ?? `activity-tool-${item.createdAt}-${index}`,
					item,
					toolName: getToolNameFromTimelineItem(item),
				});
			}
		}

		return rows;
	}, [group.items, isDeveloperModeEnabled]);

	if (activityRows.length === 0) {
		return null;
	}
	const showRowBullets = activityRows.length > 1;

	return (
		<PrimitiveTimelineItemGroup
			items={group.items}
			viewerId={currentUserId}
			viewerType={SenderType.TEAM_MEMBER}
		>
			{({ isVisitor, isAI }) => (
				<div className="flex w-full flex-row gap-2">
					<TimelineItemGroupAvatar className="flex shrink-0 flex-col justify-start pt-0.5">
						{isVisitor ? (
							<Avatar
								className="size-6"
								fallbackName={visitorName}
								url={visitor?.contact?.image}
							/>
						) : isAI ? (
							<div className="flex size-6 shrink-0 items-center justify-center">
								<Logo className="size-5 text-primary/90" />
							</div>
						) : (
							<Avatar
								className="size-6"
								fallbackName={humanAgent?.name || "Team"}
								url={humanAgent?.image}
							/>
						)}
					</TimelineItemGroupAvatar>

					<TimelineItemGroupContent className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
						<div className="flex w-full min-w-0 flex-col gap-1">
							{activityRows.map((row) => (
								<div
									className={cn(
										"flex w-full min-w-0 items-start",
										showRowBullets ? "gap-2" : "gap-0"
									)}
									key={row.key}
								>
									{showRowBullets ? (
										<span
											className="mt-[0.45rem] shrink-0"
											data-activity-bullet={row.type}
										>
											{row.type === "event"
												? renderEventActionIcon(row.event.eventType)
												: renderToolActionIcon(row.toolName)}
										</span>
									) : null}
									<div
										className={cn(
											"min-w-0",
											showRowBullets ? "flex-1" : "w-full"
										)}
									>
										{row.type === "event" ? (
											<ConversationEvent
												availableAIAgents={availableAIAgents}
												availableHumanAgents={availableHumanAgents}
												createdAt={row.item.createdAt}
												event={row.event}
												showIcon={false}
												visitor={visitor}
											/>
										) : (
											<ToolCall
												item={row.item}
												mode={isDeveloperModeEnabled ? "developer" : "default"}
												showIcon={false}
											/>
										)}
									</div>
								</div>
							))}
						</div>
					</TimelineItemGroupContent>
				</div>
			)}
		</PrimitiveTimelineItemGroup>
	);
}
