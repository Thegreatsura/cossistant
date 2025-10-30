"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type FakeMouseCursorProps = {
	isVisible: boolean;
	targetElementRef: React.RefObject<HTMLElement | null>;
	onClick: () => void;
	className?: string;
};

export function FakeMouseCursor({
	isVisible,
	targetElementRef,
	onClick,
	className,
}: FakeMouseCursorProps) {
	const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
	const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
	const cursorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isVisible) {
			return;
		}

		// Use requestAnimationFrame to ensure DOM is ready
		const updatePositions = () => {
			if (!targetElementRef.current) {
				// Retry if element not found yet
				setTimeout(updatePositions, 50);
				return;
			}

			// Find the Page component (direct parent container with relative positioning)
			const pageContainer = targetElementRef.current.closest(".relative");

			if (!pageContainer) {
				// Retry if container not found
				setTimeout(updatePositions, 50);
				return;
			}

			const containerRect = (
				pageContainer as HTMLElement
			).getBoundingClientRect();
			const targetRect = targetElementRef.current.getBoundingClientRect();

			// Only proceed if target element has valid dimensions
			if (targetRect.width === 0 || targetRect.height === 0) {
				setTimeout(updatePositions, 50);
				return;
			}

			// Calculate target position relative to Page container
			const targetX =
				targetRect.left - containerRect.left + targetRect.width / 2;
			const targetY =
				targetRect.top - containerRect.top + targetRect.height / 2;

			// Start from top-right corner (slightly outside viewport)
			const startX = containerRect.width + 20;
			const startY = 100;

			setStartPosition({ x: startX, y: startY });
			setTargetPosition({ x: targetX, y: targetY });
		};

		// Use multiple attempts to ensure layout is stable
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				updatePositions();
			});
		});

		const timeout = setTimeout(updatePositions, 150);

		return () => clearTimeout(timeout);
	}, [isVisible, targetElementRef]);

	// Don't render until positions are calculated (prevents flash of cursor in wrong position)
	if (!isVisible) {
		return null;
	}

	// Wait for positions to be calculated before rendering
	if (startPosition.x === 0 && targetPosition.x === 0) {
		return null;
	}

	return (
		<motion.div
			animate={{
				x: targetPosition.x - startPosition.x,
				y: targetPosition.y - startPosition.y,
				scale: [1, 0.85, 1],
			}}
			className={cn(
				"pointer-events-none absolute z-50 size-6 rounded-full border-2 border-foreground/90 bg-primary shadow-xl",
				className
			)}
			initial={{ scale: 1, opacity: 1 }}
			onAnimationComplete={() => {
				// Trigger click after animation completes
				onClick();
			}}
			ref={cursorRef}
			style={{
				left: startPosition.x,
				top: startPosition.y,
			}}
			transition={{
				duration: 1.2,
				ease: [0.25, 0.1, 0.25, 1],
				scale: {
					times: [0, 0.85, 1],
					duration: 1.2,
				},
			}}
		>
			{/* Cursor pointer - make it more visible */}
			<div className="absolute top-1 left-1 size-2 rounded-full bg-foreground" />
		</motion.div>
	);
}
