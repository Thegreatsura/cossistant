import * as React from "react";
import { useSupport } from "../provider";
import { useSupportConfig } from "../support";
import { useRenderElement } from "../utils/use-render-element";

export type SupportBubbleProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children?:
    | React.ReactNode
    | ((props: {
        isOpen: boolean;
        unreadCount: number;
        toggle: () => void;
      }) => React.ReactNode);
  asChild?: boolean;
  className?: string;
};

/**
 * Floating action button that toggles the support window. Exposes widget state
 * and unread counts to render-prop children for fully custom UI shells.
 */
export const SupportBubble = (() => {
  const Component = React.forwardRef<HTMLButtonElement, SupportBubbleProps>(
    ({ children, className, asChild = false, ...props }, ref) => {
      const { isOpen, toggle } = useSupportConfig();
      const { unreadCount } = useSupport();

      const renderProps = { isOpen, unreadCount, toggle };

      const content =
        typeof children === "function" ? children(renderProps) : children;

      return useRenderElement(
        "button",
        {
          asChild,
          className,
        },
        {
          ref,
          state: renderProps,
          props: {
            type: "button",
            "aria-haspopup": "dialog",
            "aria-expanded": isOpen,
            onClick: toggle,
            ...props,
            children: content,
          },
        },
      );
    },
  );

  Component.displayName = "SupportBubble";
  return Component;
})();
