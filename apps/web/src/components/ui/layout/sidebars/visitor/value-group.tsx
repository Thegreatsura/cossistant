import type * as React from "react";
import { cn } from "@/lib/utils";

export function ValueGroup({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("mt-4 flex flex-col gap-3 px-2", className)}>
			{children}
		</div>
	);
}
