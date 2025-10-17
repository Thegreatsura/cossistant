import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

/**
 * Metadata describing a timeline event with parsed parts that can be consumed
 * by render-prop children.
 */
export type TimelineEventRenderProps = {
	eventType?: string;
	actorUserId?: string | null;
	actorAiAgentId?: string | null;
	targetUserId?: string | null;
	targetAiAgentId?: string | null;
	message?: string | null;
	timestamp: Date;
	text: string | null;
};

export type TimelineEventProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?:
		| React.ReactNode
		| ((props: TimelineEventRenderProps) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	item: TimelineItem;
};

/**
 * Renders a timeline event with accessibility attributes and parses event
 * metadata into convenient render props for custom event displays.
 */
export const TimelineEvent = (() => {
	const Component = React.forwardRef<HTMLDivElement, TimelineEventProps>(
		({ children, className, asChild = false, item, ...props }, ref) => {
			// Parse event parts to extract event metadata
			const eventPart = item.parts.find(
				(part: unknown): part is Record<string, unknown> =>
					typeof part === "object" &&
					part !== null &&
					"type" in part &&
					part.type === "event"
			);

			const renderProps: TimelineEventRenderProps = {
				eventType:
					typeof eventPart?.eventType === "string"
						? eventPart.eventType
						: undefined,
				actorUserId:
					typeof eventPart?.actorUserId === "string"
						? eventPart.actorUserId
						: null,
				actorAiAgentId:
					typeof eventPart?.actorAiAgentId === "string"
						? eventPart.actorAiAgentId
						: null,
				targetUserId:
					typeof eventPart?.targetUserId === "string"
						? eventPart.targetUserId
						: null,
				targetAiAgentId:
					typeof eventPart?.targetAiAgentId === "string"
						? eventPart.targetAiAgentId
						: null,
				message:
					typeof eventPart?.message === "string" ? eventPart.message : null,
				timestamp: new Date(item.createdAt),
				text: item.text,
			};

			const eventContent =
				typeof children === "function" ? children(renderProps) : children;

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					state: renderProps,
					props: {
						role: "article",
						"aria-label": `Event: ${renderProps.eventType ?? "unknown"}`,
						...props,
						children: eventContent,
					},
				}
			);
		}
	);

	Component.displayName = "TimelineEvent";
	return Component;
})();

export type TimelineEventContentProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children?: React.ReactNode | ((text: string | null) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	text?: string | null;
};

/**
 * Renders the content/text of a timeline event with optional render prop for
 * custom formatting.
 */
export const TimelineEventContent = (() => {
	const Component = React.forwardRef<HTMLDivElement, TimelineEventContentProps>(
		({ children, className, asChild = false, text = null, ...props }, ref) => {
			const eventContent = React.useMemo(() => {
				if (typeof children === "function") {
					return children(text);
				}
				if (children) {
					return children;
				}
				return text;
			}, [children, text]);

			return useRenderElement(
				"div",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children: eventContent,
					},
				}
			);
		}
	);

	Component.displayName = "TimelineEventContent";
	return Component;
})();

export type TimelineEventTimestampProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"children"
> & {
	children?: React.ReactNode | ((timestamp: Date) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	timestamp: Date;
	format?: (date: Date) => string;
};

/**
 * Timestamp helper for timeline events that renders a formatted date or allows
 * callers to supply a render prop for custom time displays.
 */
export const TimelineEventTimestamp = (() => {
	const Component = React.forwardRef<
		HTMLSpanElement,
		TimelineEventTimestampProps
	>(
		(
			{
				children,
				className,
				asChild = false,
				timestamp,
				format = (date) =>
					date.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					}),
				...props
			},
			ref
		) => {
			const content =
				typeof children === "function"
					? children(timestamp)
					: children || format(timestamp);

			return useRenderElement(
				"span",
				{
					className,
					asChild,
				},
				{
					ref,
					props: {
						...props,
						children: content,
					},
				}
			);
		}
	);

	Component.displayName = "TimelineEventTimestamp";
	return Component;
})();
