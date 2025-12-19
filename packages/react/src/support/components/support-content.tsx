"use client";

import { motion } from "motion/react";
import type React from "react";

import type { SupportProps } from "../index";
import type { CustomPage } from "../router";
import { SupportRouter } from "../router";
import { cn } from "../utils";
import { Bubble } from "./bubble";
import { Container } from "./container";

type SupportContentProps = {
	className?: string;
	position?: "top" | "bottom";
	align?: "right" | "left";
	positioning?: "fixed" | "absolute" | "relative";
	slots?: SupportProps["slots"];
	classNames?: SupportProps["classNames"];
	customPages?: CustomPage[];
	children?: React.ReactNode;
};

/**
 * Main support widget container handling layout, positioning, and routing.
 */
export const SupportContent: React.FC<SupportContentProps> = ({
	className,
	position = "bottom",
	align = "right",
	positioning = "fixed",
	slots = {},
	classNames = {},
	customPages,
	children,
}) => {
	// Use custom components if provided, otherwise use defaults
	const BubbleComponent = slots.bubble ?? Bubble;
	const ContainerComponent = slots.container ?? Container;
	const RouterComponent = slots.router ?? SupportRouter;

	const containerClasses = cn(
		"cossistant z-[9999]",
		positioning,
		{
			"bottom-4": position === "bottom",
			"top-4": position === "top",
			"right-4": align === "right",
			"left-4": align === "left",
		},
		classNames.root,
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
			<BubbleComponent
				className={cn("z-[1000] md:z-[9999]", classNames.bubble)}
			/>
			<ContainerComponent
				align={align}
				className={classNames.container}
				position={position}
			>
				<RouterComponent customPages={customPages}>{children}</RouterComponent>
			</ContainerComponent>
		</motion.div>
	);
};
