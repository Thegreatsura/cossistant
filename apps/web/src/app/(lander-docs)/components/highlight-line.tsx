import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const highlightLineVariants = cva(
	"mr-1 mb-[3px] inline-flex items-center rounded border px-2 py-0.5 align-middle font-medium font-mono text-primary text-xs uppercase",
	{
		variants: {
			variant: {
				new: "border-cossistant-green/60 bg-cossistant-green/20 text-cossistant-green",
				updated:
					"border-cossistant-blue/60 bg-cossistant-blue/20 text-cossistant-blue",
				fixed:
					"border-cossistant-yellow/60 bg-cossistant-yellow/20 text-cossistant-yellow",
				removed:
					"border-cossistant-red/60 bg-cossistant-red/20 text-cossistant-red",
			},
		},
	}
);

export type HighlightLineProps = React.ComponentProps<"span"> &
	VariantProps<typeof highlightLineVariants> & {
		asChild?: boolean;
	};

export function HighlightLine({ children, ...props }: HighlightLineProps) {
	return (
		<span className="[&>p]:m-0 [&>p]:inline">
			<span className={cn(highlightLineVariants({ variant: props.variant }))}>
				{props.variant}
			</span>{" "}
			{children}
		</span>
	);
}
