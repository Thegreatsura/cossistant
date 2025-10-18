import type { TimelineItem as TimelineItemType } from "@cossistant/types/api/timeline-item";
import * as React from "react";
import { useRenderElement } from "../utils/use-render-element";

/**
 * High-level state of the timeline handed to render-prop children so they can show
 * skeletons, empty states or pagination affordances.
 */
export type ConversationTimelineRenderProps = {
  itemCount: number;
  isLoading?: boolean;
  hasMore?: boolean;
  isEmpty: boolean;
};

export type ConversationTimelineProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?:
    | React.ReactNode
    | ((props: ConversationTimelineRenderProps) => React.ReactNode);
  asChild?: boolean;
  className?: string;
  items?: TimelineItemType[];
  isLoading?: boolean;
  hasMore?: boolean;
  autoScroll?: boolean;
  onScrollEnd?: () => void;
  onScrollStart?: () => void;
};

/**
 * Scrollable conversation timeline that wires auto-scroll behaviour, live-region semantics and
 * pagination callbacks for displaying timeline items (messages, events, etc.).
 */
export const ConversationTimeline = (() => {
  const Component = React.forwardRef<HTMLDivElement, ConversationTimelineProps>(
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
      const setRefs = React.useCallback(
        (node: HTMLDivElement | null) => {
          internalRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
          }
        },
        [ref]
      );

      const isInitialRender = React.useRef(true);
      const previousItemCount = React.useRef(items.length);

      const renderProps: ConversationTimelineRenderProps = {
        itemCount: items.length,
        isLoading,
        hasMore,
        isEmpty: items.length === 0,
      };

      const content =
        typeof children === "function" ? children(renderProps) : children;

      // Auto-scroll to bottom when new timeline items are added
      React.useEffect(() => {
        if (autoScroll && internalRef.current) {
          const hasNewItems = items.length > previousItemCount.current;

          // Only scroll if there are new items or it's the first render
          if (hasNewItems || isInitialRender.current) {
            internalRef.current.scrollTop = internalRef.current.scrollHeight;
          }

          // Update refs for next render
          previousItemCount.current = items.length;
          isInitialRender.current = false;
        }
      }, [items.length, autoScroll]);

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
          ref: setRefs,
          state: renderProps,
          props: {
            role: "log",
            "aria-label": "Conversation timeline",
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

  Component.displayName = "ConversationTimeline";
  return Component;
})();

export type ConversationTimelineContainerProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Wrapper around the scrollable timeline giving consumers an easy hook to add
 * padding, backgrounds or transitions without touching the core timeline logic.
 */
export const ConversationTimelineContainer = (() => {
  const Component = React.forwardRef<
    HTMLDivElement,
    ConversationTimelineContainerProps
  >(({ children, className, asChild = false, ...props }, ref) =>
    useRenderElement(
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
    )
  );

  Component.displayName = "ConversationTimelineContainer";
  return Component;
})();

export type ConversationTimelineLoadingProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Accessible status region for loading more timeline items. Lets host apps render
 * skeletons or shimmer states without reimplementing ARIA wiring.
 */
export const ConversationTimelineLoading = (() => {
  const Component = React.forwardRef<
    HTMLDivElement,
    ConversationTimelineLoadingProps
  >(({ children, className, asChild = false, ...props }, ref) =>
    useRenderElement(
      "div",
      {
        className,
        asChild,
      },
      {
        ref,
        props: {
          role: "status",
          "aria-label": "Loading timeline items",
          ...props,
          children,
        },
      }
    )
  );

  Component.displayName = "ConversationTimelineLoading";
  return Component;
})();

export type ConversationTimelineEmptyProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children?: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

/**
 * Placeholder state rendered when no timeline items are present. Uses a polite status
 * region so screen readers announce the empty state.
 */
export const ConversationTimelineEmpty = (() => {
  const Component = React.forwardRef<
    HTMLDivElement,
    ConversationTimelineEmptyProps
  >(({ children, className, asChild = false, ...props }, ref) =>
    useRenderElement(
      "div",
      {
        className,
        asChild,
      },
      {
        ref,
        props: {
          role: "status",
          "aria-label": "No timeline items",
          ...props,
          children,
        },
      }
    )
  );

  Component.displayName = "ConversationTimelineEmpty";
  return Component;
})();
