import type * as React from "react";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string | React.ReactNode | null | undefined;
  placeholder?: string;
  tooltip?: string;
  className?: string;
};

export function ValueDisplay({
  title,
  value,
  placeholder,
  tooltip,
  className,
}: Props) {
  return (
    <TooltipOnHover content={tooltip} side="left">
      <div className={cn("flex items-center justify-between gap-4", className)}>
        <p className="text-primary/60 text-xs">{title}</p>
        <p
          className={cn(
            "flex-1 text-right text-xs",
            value ? "text-primary" : "text-primary/40",
          )}
        >
          {typeof value === "string" ? value : value || placeholder}
        </p>
      </div>
    </TooltipOnHover>
  );
}
