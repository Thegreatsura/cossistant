import type React from "react";

/**
 * Props for custom Bubble slot component
 */
export type BubbleSlotProps = {
	className?: string;
};

/**
 * Props for custom Container slot component
 */
export type ContainerSlotProps = {
	className?: string;
	children: React.ReactNode;
	position?: "top" | "bottom";
	align?: "right" | "left";
};

/**
 * Props for custom Router slot component
 */
export type RouterSlotProps = {
	children?: React.ReactNode;
};
