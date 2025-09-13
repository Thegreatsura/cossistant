"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";
import { cn } from "@/lib/utils";

function AvatarContainer({
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

function Avatar({
  className,
  url,
  fallbackName,
  lastOnlineAt,
}: {
  className?: string;
  url: string | null | undefined;
  fallbackName: string;
  lastOnlineAt?: Date | null;
}) {
  // If lastOnlineAt is within the last 5 minutes, the user is online
  const isOnline =
    lastOnlineAt &&
    new Date(lastOnlineAt) > new Date(Date.now() - 1000 * 60 * 5);

  const color = isOnline ? "bg-co-green" : "bg-co-orange";

  return (
    <div className="relative">
      <AvatarContainer className={cn("size-8 shrink-0", className)}>
        {url && <AvatarImage alt={fallbackName} src={url} />}
        <AvatarFallback>{fallbackName}</AvatarFallback>
      </AvatarContainer>
      {isOnline && (
        <div
          className={cn(
            "absolute right-0 bottom-0 size-1 rounded-full ring-2 ring-background group-hover/conversation-item:ring-background-400",
            color
          )}
        />
      )}
    </div>
  );
}

export { AvatarContainer, AvatarImage, AvatarFallback, Avatar };
