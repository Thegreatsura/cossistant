"use client";

import { motion } from "motion/react";
import type React from "react";

import { SupportRouter } from "../router";
import { cn } from "../utils";
import { Bubble } from "./bubble";
import { Container } from "./container";

type SupportContentProps = {
	className?: string;
	position?: "top" | "bottom";
	align?: "right" | "left";
	mode?: "floating" | "responsive";
};

/**
 * Main support widget content container.
 *
 * Handles the layout and positioning of the support widget,
 * and renders the appropriate page via SupportRouter.
 *
 * Each page (e.g., conversation, home) manages its own state internally,
 * so this component is purely presentational.
 */
export const SupportContent: React.FC<SupportContentProps> = ({
	className,
	position = "bottom",
	align = "right",
	mode = "floating",
}) => {
	const containerClasses = cn(
		"cossistant",
		{
			// Floating mode positioning
			"fixed z-[9999]": mode === "floating",
			"bottom-4": mode === "floating" && position === "bottom",
			"top-4": mode === "floating" && position === "top",
			"right-4": mode === "floating" && align === "right",
			"left-4": mode === "floating" && align === "left",
			// Responsive mode
			"relative h-full w-full": mode === "responsive",
		},
		className
	);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className={containerClasses}
			initial={{ opacity: 0 }}
			layout="position"
			transition={{
				default: { ease: "anticipate" },
				layout: { duration: 0.3 },
			}}
		>
			{mode === "floating" && <Bubble className="z-[1000] md:z-[9999]" />}
			<Container align={align} mode={mode} position={position}>
				<SupportRouter />
			</Container>
		</motion.div>
	);
};
