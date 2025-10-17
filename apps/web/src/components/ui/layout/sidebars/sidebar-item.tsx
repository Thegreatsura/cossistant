"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "../../icons";

type SidebarItemProps = {
  children: ReactNode;
  iconName?: IconName;
  actions?: ReactNode;
  rightItem?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
};

export function SidebarItem({
  children,
  iconName,
  actions,
  href,
  onClick,
  className,
  active = false,
  rightItem,
}: SidebarItemProps) {
  const baseClasses = cn(
    "group/btn relative flex h-10 items-center gap-2.5 rounded-md px-3 py-1 text-primary/80 text-sm transition-colors",
    "hover:bg-background-100 hover:text-primary dark:hover:bg-background-300",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active && "bg-background-100 text-primary dark:bg-background-300",
    className,
  );

  const content = (
    <>
      {iconName && (
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center opacity-40 transition-all duration-100 group-hover/btn:rotate-[-4deg] group-hover/btn:opacity-80",
            {
              "rotate-[-2deg] opacity-90 group-hover/btn:opacity-80": active,
            },
          )}
        >
          <Icon
            className="size-4"
            filledOnHover={!active}
            name={iconName}
            variant={active ? "filled" : "default"}
          />
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {rightItem}
      {actions && (
        <span className="opacity-0 transition-opacity group-hover/btn:opacity-100">
          {actions}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link className={baseClasses} href={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      className={cn(baseClasses, "w-full text-left")}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}
