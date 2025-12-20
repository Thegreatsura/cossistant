import type React from "react";

// =============================================================================
// Positioning Types
// =============================================================================

/**
 * Side of the trigger where the content appears.
 */
export type Side = "top" | "bottom" | "left" | "right";

/**
 * Alignment along the side axis.
 */
export type Align = "start" | "center" | "end";

// =============================================================================
// Trigger Types
// =============================================================================

/**
 * Render props provided to the Trigger's children function.
 * Use this when you need dynamic content based on widget state.
 *
 * @example
 * <Support.Trigger>
 *   {({ isOpen, isTyping, unreadCount }) => (
 *     <span>{isOpen ? "Close" : `Help (${unreadCount})`}</span>
 *   )}
 * </Support.Trigger>
 */
export type TriggerRenderProps = {
	/** Whether the support window is currently open */
	isOpen: boolean;
	/** Whether an agent or AI is currently typing */
	isTyping: boolean;
	/** Number of unread messages */
	unreadCount: number;
	/** Toggle the support window open/closed */
	toggle: () => void;
};

// =============================================================================
// Content Types
// =============================================================================

/**
 * Props for the Content component.
 */
export type ContentProps = {
	className?: string;
	/**
	 * Which side of the trigger to place the content.
	 * @default "top"
	 */
	side?: Side;
	/**
	 * Alignment along the side axis.
	 * @default "end"
	 */
	align?: Align;
	/**
	 * Distance (in pixels) between the trigger and the content.
	 * @default 16
	 */
	sideOffset?: number;
	children?: React.ReactNode;
};

// =============================================================================
// Root Types
// =============================================================================

/**
 * Props for the Root component (full composition mode).
 */
export type RootProps = {
	/**
	 * Whether the widget should open automatically on mount.
	 * @default false
	 */
	defaultOpen?: boolean;
	children: React.ReactNode;
};
