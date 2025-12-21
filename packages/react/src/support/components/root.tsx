"use client";

import { motion } from "motion/react";
import type * as React from "react";
import { TriggerRefProvider } from "../context/positioning";
import { cn } from "../utils";

export type RootProps = {
	className?: string;
	children: React.ReactNode;
};

/**
 * Root wrapper component that provides the positioning context.
 * Contains the trigger and content as siblings.
 *
 * @example
 * <Support.Root>
 *   <Support.Trigger>Help</Support.Trigger>
 *   <Support.Content>
 *     <Support.Router />
 *   </Support.Content>
 * </Support.Root>
 */
export const Root: React.FC<RootProps> = ({ className, children }) => (
	<TriggerRefProvider>
		<motion.div
			animate={{ opacity: 1 }}
			className={cn("cossistant relative", className)}
			initial={{ opacity: 0 }}
			layout="position"
			transition={{
				default: { ease: "anticipate" },
				layout: { duration: 0.3 },
			}}
		>
			{children}
		</motion.div>
	</TriggerRefProvider>
);
