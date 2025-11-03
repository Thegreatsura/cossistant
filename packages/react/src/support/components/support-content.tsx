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
	positioning?: "fixed" | "absolute";
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
	positioning = "fixed",
}) => {
	const containerClasses = cn(
		"cossistant z-[9999]",
		positioning === "fixed" ? "fixed" : "absolute",
		{
			"bottom-4": position === "bottom",
			"top-4": position === "top",
			"right-4": align === "right",
			"left-4": align === "left",
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
			<Bubble className="z-[1000] md:z-[9999]" />
			<Container align={align} position={position}>
				<SupportRouter />
			</Container>
		</motion.div>
	);
};
