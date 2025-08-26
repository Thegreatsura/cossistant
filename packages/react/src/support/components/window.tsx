"use client";

import { motion } from "motion/react";
import type React from "react";
import * as Primitive from "../../primitive";
import { cn } from "../utils";

export interface WindowProps {
	className?: string;
	children: React.ReactNode;
	mode?: "floating" | "responsive";
	position?: "top" | "bottom";
	align?: "right" | "left";
}

export const Window: React.FC<WindowProps> = ({
	className,
	children,
	mode = "floating",
	position = "bottom",
	align = "right",
}) => {
	return (
		<Primitive.Window asChild>
			<motion.div
				animate="visible"
				className={cn(
					// Common base styles
					"flex flex-col overflow-clip bg-co-background",

					// Mobile styles - always full screen
					"max-md:fixed max-md:inset-0",

					// Desktop floating mode
					mode === "floating" && [
						"z-[9999] md:absolute md:z-[9900] md:aspect-[9/16] md:max-h-[calc(100vh-6rem)] md:w-[400px] md:rounded-lg md:border md:border-co-border/50 md:shadow-xl md:dark:shadow-co-background-600",
						position === "bottom" && "md:bottom-16",
						position === "top" && "md:top-16",
						align === "right" && "md:right-0",
						align === "left" && "md:left-0",
					],

					// Desktop responsive mode
					mode === "responsive" &&
						"md:relative md:h-full md:w-full md:rounded-none md:border-0 md:shadow-none",

					className
				)}
				exit="exit"
				initial="hidden"
				transition={{
					default: { ease: "anticipate" },
					layout: { duration: 0.3 },
				}}
				variants={{
					hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
					visible: { opacity: 1, y: 0, filter: "blur(0px)" },
					exit: { opacity: 0, y: 10, filter: "blur(6px)" },
				}}
			>
				{children}
			</motion.div>
		</Primitive.Window>
	);
};
