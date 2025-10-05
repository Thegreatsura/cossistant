"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { TooltipOnHover } from "./tooltip";

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

const REGEX_SPLIT_INITIALS = /\s+/;

function AvatarFallback({
  className,
  value,
  children,
  ...props
}: AvatarFallbackProps) {
  const getInitials = (str: string) => {
    return str
      .split(REGEX_SPLIT_INITIALS)
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
          "bg-background-400 text-[10px] text-primary dark:bg-background-500",
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
  lastOnlineAt?: string | null;
}) {
  // If lastOnlineAt is within the last 5 minutes, the user is online
  const isOnline =
    lastOnlineAt &&
    new Date(lastOnlineAt) > new Date(Date.now() - 1000 * 60 * 5);

  // If lastOnlineAt is within the last 30 minutes, and the user is not online, the user is away
  const isAway =
    lastOnlineAt &&
    new Date(lastOnlineAt) > new Date(Date.now() - 1000 * 60 * 30) &&
    !isOnline;

  return (
    <TooltipOnHover
      content={
        lastOnlineAt
          ? isAway
            ? `${fallbackName} last seen less than 30 minutes ago`
            : isOnline
              ? `${fallbackName} is online`
              : `${fallbackName} last seen ${formatTimeAgo(new Date(lastOnlineAt))}`
          : null
      }
    >
      <div className="relative">
        <AvatarContainer className={cn("size-8 shrink-0", className)}>
          {url && <AvatarImage alt={fallbackName} src={url} />}
          <AvatarFallback className="pointer-events-none">
            {fallbackName}
          </AvatarFallback>
        </AvatarContainer>
        {isOnline && (
          <div
            className={cn(
              "-right-0.5 -bottom-0.5 absolute hidden size-1.5 rounded-full shadow",
              {
                "block bg-cossistant-green": isOnline,
                "block bg-cossistant-orange": isAway,
              }
            )}
          />
        )}
      </div>
    </TooltipOnHover>
  );
}

export { AvatarContainer, AvatarImage, AvatarFallback, Avatar };
