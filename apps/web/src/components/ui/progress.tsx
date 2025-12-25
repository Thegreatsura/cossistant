"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
	value?: number;
	indicatorClassName?: string;
};

const Progress = ({
	className,
	value = 0,
	indicatorClassName,
	...props
}: ProgressProps) => (
	<div
		aria-valuemax={100}
		aria-valuemin={0}
		aria-valuenow={value}
		className={cn(
			"relative h-4 w-full overflow-hidden rounded-full bg-secondary",
			className
		)}
		role="progressbar"
		{...props}
	>
		<div
			className={cn(
				"h-full bg-primary transition-all duration-300 ease-in-out",
				indicatorClassName
			)}
			style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
		/>
	</div>
);
Progress.displayName = "Progress";

export { Progress };
