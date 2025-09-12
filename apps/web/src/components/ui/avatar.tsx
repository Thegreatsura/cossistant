"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import Avvvatars from "avvvatars-react";
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
}

function AvatarFallback({
  className,
  value,
  children,
  ...props
}: AvatarFallbackProps) {
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
      {<Avvvatars size={32} style="shape" value={value ?? ""} />}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
