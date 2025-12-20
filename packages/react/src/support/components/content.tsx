"use client";

import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import * as Primitive from "../../primitives";
import type { Align, ContentProps as ContentPropsType, Side } from "../types";

export type { ContentProps } from "../types";

import { cn } from "../utils";

/**
 * Get positioning classes based on side and align props.
 */
function getPositioningClasses(side: Side, align: Align): string {
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
 * Get offset styles based on side and sideOffset.
 */
function getOffsetStyle(
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

/**
 * Content component for the support window.
 * Positioned relative to the trigger using CSS classes.
 * Fullscreen on mobile, floating on desktop.
 *
 * @example
 * // Basic usage (uses defaults: side="top", align="end")
 * <Support.Content />
 *
 * @example
 * // Custom positioning
 * <Support.Content side="bottom" align="start" sideOffset={24} />
 *
 * @example
 * // With custom styling
 * <Support.Content className="border-purple-200 shadow-2xl" />
 */
export const Content: React.FC<ContentPropsType> = ({
	className,
	children,
	side = "top",
	align = "end",
	sideOffset = 16,
}) => {
	const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

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

	return (
		<Primitive.Window asChild>
			<motion.div
				animate="visible"
				className={cn(
					// Common base styles
					"flex flex-col overflow-hidden overscroll-none bg-co-background",

					// Mobile: fullscreen fixed
					"max-md:fixed max-md:inset-0 max-md:z-[9999]",

					// Desktop: floating window with CSS-based positioning
					"md:absolute md:z-[9999] md:aspect-[9/17] md:max-h-[calc(100vh-6rem)] md:w-[400px] md:rounded-md md:border md:border-co-border md:shadow md:dark:shadow-co-background-600/50",

					// Dynamic positioning classes
					getPositioningClasses(side, align),

					className
				)}
				exit="exit"
				initial="hidden"
				style={getOffsetStyle(side, sideOffset)}
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
