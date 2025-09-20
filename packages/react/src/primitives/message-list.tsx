import type {
	ConversationEvent,
	Message as MessageType,
} from "@cossistant/types";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

export type MessageListRenderProps = {
	messageCount: number;
	eventCount: number;
	isLoading?: boolean;
	hasMore?: boolean;
	isEmpty: boolean;
};

export interface MessageListProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	children?:
		| React.ReactNode
		| ((props: MessageListRenderProps) => React.ReactNode);
	asChild?: boolean;
	className?: string;
	messages?: MessageType[];
	events?: ConversationEvent[];
	isLoading?: boolean;
	hasMore?: boolean;
	autoScroll?: boolean;
	onScrollEnd?: () => void;
	onScrollStart?: () => void;
}

export const MessageList = React.forwardRef<HTMLDivElement, MessageListProps>(
	(
		{
			children,
			className,
			asChild = false,
			messages = [],
			events = [],
			isLoading = false,
			hasMore = false,
			autoScroll = true,
			onScrollEnd,
			onScrollStart,
			...props
		},
		ref
	) => {
		const internalRef = React.useRef<HTMLDivElement>(null);
		const scrollRef =
			(ref as React.MutableRefObject<HTMLDivElement>) || internalRef;

		const isInitialRender = React.useRef(true);
		const previousMessageCount = React.useRef(messages.length);
		const previousEventCount = React.useRef(events.length);

		const renderProps: MessageListRenderProps = {
			messageCount: messages.length,
			eventCount: events.length,
			isLoading,
			hasMore,
			isEmpty: messages.length === 0 && events.length === 0,
		};

		const content =
			typeof children === "function" ? children(renderProps) : children;

		// Auto-scroll to bottom when new messages are added
		React.useEffect(() => {
			if (autoScroll && scrollRef.current) {
				const hasNewMessages =
					messages.length > previousMessageCount.current ||
					events.length > previousEventCount.current;

				// Only scroll if there are new messages or it's the first render
				if (hasNewMessages || isInitialRender.current) {
					// On first render, scroll instantly to avoid animation
					// For new messages, scroll smoothly
					const behavior = isInitialRender.current ? "instant" : "smooth";

					scrollRef.current.scrollTo({
						top: scrollRef.current.scrollHeight,
						behavior,
					});
				}

				// Update refs for next render
				previousMessageCount.current = messages.length;
				previousEventCount.current = events.length;
				isInitialRender.current = false;
			}
		}, [messages.length, events.length, autoScroll, scrollRef]);

		// Handle scroll events for infinite scrolling
		const handleScroll = React.useCallback(
			(e: React.UIEvent<HTMLDivElement>) => {
				const element = e.currentTarget;
				const { scrollTop, scrollHeight, clientHeight } = element;

				// Check if scrolled to top
				if (scrollTop === 0 && onScrollStart) {
					onScrollStart();
				}

				// Check if scrolled to bottom
				if (scrollTop + clientHeight >= scrollHeight - 10 && onScrollEnd) {
					onScrollEnd();
				}
			},
			[onScrollStart, onScrollEnd]
		);

		return useRenderElement(
			"div",
			{
				className,
				asChild,
			},
			{
				ref: scrollRef,
				state: renderProps,
				props: {
					role: "log",
					"aria-label": "Message list",
					"aria-live": "polite",
					"aria-relevant": "additions",
					onScroll: handleScroll,
					...props,
					children: content,
				},
			}
		);
	}
);

MessageList.displayName = "MessageList";

export interface MessageListContainerProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	children?: React.ReactNode;
	asChild?: boolean;
	className?: string;
}

export const MessageListContainer = React.forwardRef<
	HTMLDivElement,
	MessageListContainerProps
>(({ children, className, asChild = false, ...props }, ref) => {
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
				children,
			},
		}
	);
});

MessageListContainer.displayName = "MessageListContainer";

export interface MessageListLoadingProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	children?: React.ReactNode;
	asChild?: boolean;
	className?: string;
}

export const MessageListLoading = React.forwardRef<
	HTMLDivElement,
	MessageListLoadingProps
>(({ children, className, asChild = false, ...props }, ref) => {
	return useRenderElement(
		"div",
		{
			className,
			asChild,
		},
		{
			ref,
			props: {
				role: "status",
				"aria-label": "Loading messages",
				...props,
				children,
			},
		}
	);
});

MessageListLoading.displayName = "MessageListLoading";

export interface MessageListEmptyProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	children?: React.ReactNode;
	asChild?: boolean;
	className?: string;
}

export const MessageListEmpty = React.forwardRef<
	HTMLDivElement,
	MessageListEmptyProps
>(({ children, className, asChild = false, ...props }, ref) => {
	return useRenderElement(
		"div",
		{
			className,
			asChild,
		},
		{
			ref,
			props: {
				role: "status",
				"aria-label": "No messages",
				...props,
				children,
			},
		}
	);
});

MessageListEmpty.displayName = "MessageListEmpty";
