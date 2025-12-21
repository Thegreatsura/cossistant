"use client";

import {
	autoUpdate,
	flip,
	offset,
	type Placement,
	shift,
	useFloating,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import * as Primitive from "../../primitives";
import { useTriggerRef } from "../context/positioning";
import type {
	Align,
	CollisionPadding,
	ContentProps as ContentPropsType,
	Side,
} from "../types";
import { cn } from "../utils";

export type { CollisionPadding, ContentProps } from "../types";

// =============================================================================
// Utils
// =============================================================================

/**
 * Convert side + align props to Floating UI placement
 */
function getPlacement(side: Side, align: Align): Placement {
	if (align === "center") {
		return side;
	}
	return `${side}-${align}` as Placement;
}

/**
 * Get fallback positioning classes for when Floating UI is not available
 * (e.g., trigger ref not set, or avoidCollisions is false)
 */
function getFallbackPositioningClasses(side: Side, align: Align): string {
	const sideClasses: Record<Side, string> = {
		top: "md:bottom-full md:mb-4",
		bottom: "md:top-full md:mt-4",
		left: "md:right-full md:mr-4",
		right: "md:left-full md:ml-4",
	};

	const alignClasses: Record<Side, Record<Align, string>> = {
		top: {
			start: "md:left-0",
			center: "md:left-1/2 md:-translate-x-1/2",
			end: "md:right-0",
		},
		bottom: {
			start: "md:left-0",
			center: "md:left-1/2 md:-translate-x-1/2",
			end: "md:right-0",
		},
		left: {
			start: "md:top-0",
			center: "md:top-1/2 md:-translate-y-1/2",
			end: "md:bottom-0",
		},
		right: {
			start: "md:top-0",
			center: "md:top-1/2 md:-translate-y-1/2",
			end: "md:bottom-0",
		},
	};

	return cn(sideClasses[side], alignClasses[side][align]);
}

/**
 * Get fallback offset styles for static positioning
 */
function getFallbackOffsetStyle(
	side: Side,
	sideOffset: number
): React.CSSProperties | undefined {
	if (sideOffset === 16) {
		return;
	}

	const offsetMap: Record<Side, React.CSSProperties> = {
		top: { marginBottom: sideOffset },
		bottom: { marginTop: sideOffset },
		left: { marginRight: sideOffset },
		right: { marginLeft: sideOffset },
	};

	return offsetMap[side];
}

// =============================================================================
// Hook for responsive detection
// =============================================================================

function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = React.useState(false);

	React.useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 767px)");
		setIsMobile(mediaQuery.matches);

		const handler = (event: MediaQueryListEvent) => {
			setIsMobile(event.matches);
		};

		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, []);

	return isMobile;
}

// =============================================================================
// Content Component
// =============================================================================

/**
 * Content component for the support window.
 * Uses Floating UI for automatic collision detection on desktop.
 * Fullscreen on mobile, floating on desktop.
 *
 * @example
 * // Basic usage (uses defaults: side="top", align="end")
 * <Support.Content />
 *
 * @example
 * // Custom positioning with collision avoidance
 * <Support.Content side="bottom" align="start" sideOffset={24} />
 *
 * @example
 * // Disable collision avoidance for static positioning
 * <Support.Content avoidCollisions={false} />
 *
 * @example
 * // Custom collision padding
 * <Support.Content collisionPadding={{ top: 16, bottom: 32 }} />
 */
export const Content: React.FC<ContentPropsType> = ({
	className,
	children,
	side = "top",
	align = "end",
	sideOffset = 16,
	avoidCollisions = true,
	collisionPadding = 8,
}) => {
	const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();
	const triggerRefContext = useTriggerRef();

	// Set up Floating UI middleware
	const middleware = React.useMemo(() => {
		const middlewares = [offset(sideOffset)];

		if (avoidCollisions) {
			middlewares.push(
				flip({
					padding: collisionPadding,
					fallbackAxisSideDirection: "start",
				}),
				shift({
					padding: collisionPadding,
				})
			);
		}

		return middlewares;
	}, [sideOffset, avoidCollisions, collisionPadding]);

	// Initialize Floating UI with state-based trigger element
	// When triggerElement changes (from null to actual element), this re-renders
	const { refs, floatingStyles, isPositioned } = useFloating({
		placement: getPlacement(side, align),
		middleware,
		whileElementsMounted: autoUpdate,
		elements: {
			reference: triggerRefContext?.triggerElement,
		},
	});

	// Determine if we should use Floating UI positioning
	const useFloatingPositioning =
		avoidCollisions && !isMobile && triggerRefContext?.triggerElement !== null;

	// Scroll indicator logic
	const checkScroll = React.useCallback(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const { scrollTop, scrollHeight, clientHeight } = container;
		const isScrollable = scrollHeight > clientHeight;
		const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 5;

		setShowScrollIndicator(isScrollable && !isAtBottom);
	}, []);

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		checkScroll();

		const handleScroll = () => {
			checkScroll();
		};

		container.addEventListener("scroll", handleScroll, { passive: true });

		const resizeObserver = new ResizeObserver(() => {
			checkScroll();
		});

		resizeObserver.observe(container);

		const mutationObserver = new MutationObserver(() => {
			checkScroll();
		});

		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		return () => {
			container.removeEventListener("scroll", handleScroll);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, [checkScroll]);

	// Compute styles based on positioning mode
	const computedStyles = React.useMemo<React.CSSProperties>(() => {
		if (isMobile) {
			// Mobile: no positioning styles needed, handled by CSS classes
			return {};
		}

		if (useFloatingPositioning && isPositioned) {
			// Desktop with Floating UI: use computed floating styles
			return floatingStyles;
		}

		// Desktop fallback: use static offset styles
		return getFallbackOffsetStyle(side, sideOffset) ?? {};
	}, [
		isMobile,
		useFloatingPositioning,
		isPositioned,
		floatingStyles,
		side,
		sideOffset,
	]);

	// Compute className based on positioning mode
	const computedClassName = cn(
		// Common base styles
		"flex flex-col overflow-hidden overscroll-none bg-co-background",

		// Mobile: fullscreen fixed
		"max-md:fixed max-md:inset-0 max-md:z-[9999]",

		// Desktop: floating window base styles
		"md:z-[9999] md:aspect-[9/17] md:max-h-[calc(100vh-6rem)] md:w-[400px] md:rounded-md md:border md:border-co-border md:shadow md:dark:shadow-co-background-600/50",

		// Positioning mode specific styles
		useFloatingPositioning
			? // With Floating UI: fixed positioning
				"md:fixed"
			: // Fallback: absolute positioning with CSS classes
				cn("md:absolute", getFallbackPositioningClasses(side, align)),

		className
	);

	return (
		<Primitive.Window asChild>
			<motion.div
				animate="visible"
				className={computedClassName}
				exit="exit"
				initial="hidden"
				ref={refs.setFloating}
				style={computedStyles}
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
				<div className="relative flex h-full w-full flex-col">
					<div
						className="flex flex-1 flex-col overflow-y-auto pt-18"
						ref={containerRef}
					>
						{children}
					</div>

					<AnimatePresence>
						{showScrollIndicator && (
							<>
								<motion.div
									animate={{ opacity: 1 }}
									className="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-32 bg-gradient-to-t from-co-background via-co-background/70 to-transparent"
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
									transition={{ duration: 0.3, ease: "easeInOut" }}
								/>
								<motion.div
									animate={{ opacity: 0.6 }}
									className="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-48 bg-gradient-to-t from-co-background/80 via-co-background/30 to-transparent"
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
									transition={{ duration: 0.4, ease: "easeInOut", delay: 0.05 }}
								/>
							</>
						)}
					</AnimatePresence>
				</div>
			</motion.div>
		</Primitive.Window>
	);
};
