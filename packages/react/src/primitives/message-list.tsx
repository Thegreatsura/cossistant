import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

/**
 * High-level state of the list handed to render-prop children so they can show
 * skeletons, empty states or pagination affordances.
 */
export type MessageListRenderProps = {
  itemCount: number;
  isLoading?: boolean;
  hasMore?: boolean;
  isEmpty: boolean;
};

export type MessageListProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?:
    | React.ReactNode
    | ((props: MessageListRenderProps) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  items?: TimelineItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  autoScroll?: boolean;
  onScrollEnd?: () => void;
  onScrollStart?: () => void;
};

/**
 * Scrollable log that wires auto-scroll behaviour, live-region semantics and
 * pagination callbacks for support conversations.
 */
export const MessageList = (() => {
  const Component = React.forwardRef<HTMLDivElement, MessageListProps>(
    (
      {
        children,
        className,
        asChild = false,
        items = [],
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
      const previousItemCount = React.useRef(items.length);

      const renderProps: MessageListRenderProps = {
        itemCount: items.length,
        isLoading,
        hasMore,
        isEmpty: items.length === 0,
      };

      const content =
        typeof children === "function" ? children(renderProps) : children;

      // Auto-scroll to bottom when new timeline items are added
      React.useEffect(() => {
        if (autoScroll && scrollRef.current) {
          const hasNewItems = items.length > previousItemCount.current;

          // Only scroll if there are new items or it's the first render
          if (hasNewItems || isInitialRender.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }

          // Update refs for next render
          previousItemCount.current = items.length;
          isInitialRender.current = false;
        }
      }, [items.length, autoScroll, scrollRef]);

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

  Component.displayName = "MessageList";
  return Component;
})();

export type MessageListContainerProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Wrapper around the scrollable list giving consumers an easy hook to add
 * padding, backgrounds or transitions without touching the core list logic.
 */
export const MessageListContainer = (() => {
  const Component = React.forwardRef<HTMLDivElement, MessageListContainerProps>(
    ({ children, className, asChild = false, ...props }, ref) => {
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
    }
  );

  Component.displayName = "MessageListContainer";
  return Component;
})();

export type MessageListLoadingProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Accessible status region for loading more messages. Lets host apps render
 * skeletons or shimmer states without reimplementing ARIA wiring.
 */
export const MessageListLoading = (() => {
  const Component = React.forwardRef<HTMLDivElement, MessageListLoadingProps>(
    ({ children, className, asChild = false, ...props }, ref) => {
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
    }
  );

  Component.displayName = "MessageListLoading";
  return Component;
})();

export type MessageListEmptyProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Placeholder state rendered when no messages are present. Uses a polite status
 * region so screen readers announce the absence of messages.
 */
export const MessageListEmpty = (() => {
  const Component = React.forwardRef<HTMLDivElement, MessageListEmptyProps>(
    ({ children, className, asChild = false, ...props }, ref) => {
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
    }
  );

  Component.displayName = "MessageListEmpty";
  return Component;
})();
