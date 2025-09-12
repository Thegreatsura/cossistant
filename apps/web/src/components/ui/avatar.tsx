"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-sm",
        className
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      className={cn("aspect-square size-full", className)}
      data-slot="avatar-image"
      {...props}
    />
  );
}

interface AvatarFallbackProps
  extends React.ComponentProps<typeof AvatarPrimitive.Fallback> {
  value?: string;
  children?: string;
}

function AvatarFallback({
  className,
  value,
  children,
  ...props
}: AvatarFallbackProps) {
  const getInitials = (str: string) => {
    return str
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center rounded-sm",
        !value &&
          "bg-background-300 text-[10px] text-primary dark:bg-background-400",
        className
      )}
      data-slot="avatar-fallback"
      {...props}
    >
      {value ? getInitials(value) : getInitials(children ?? "")}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
