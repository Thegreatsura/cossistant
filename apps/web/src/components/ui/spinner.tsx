"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
	className?: string;
	size?: number;
	squaresPerSide?: number;
	squareSize?: number;
	trailLength?: number;
};

export const Spinner = ({
	className,
	size = 16,
	squaresPerSide = 3,
	squareSize = 3,
	trailLength = 3,
}: SpinnerProps) => {
	// Auto-adjust squares per side based on size if not explicitly set
	const effectiveSquaresPerSide = squaresPerSide ?? (size < 18 ? 3 : 4);
	// Generate positions for squares along the perimeter in clockwise order
	const generateSquarePositions = () => {
		const positions: { x: number; y: number }[] = [];
		const gap = (size - squareSize) / (effectiveSquaresPerSide - 1);

		// Top edge: left to right
		for (let i = 0; i < effectiveSquaresPerSide; i++) {
			positions.push({ x: i * gap, y: 0 });
		}

		// Right edge: top to bottom (skip first corner)
		for (let i = 1; i < effectiveSquaresPerSide; i++) {
			positions.push({ x: size - squareSize, y: i * gap });
		}

		// Bottom edge: right to left (skip first corner)
		for (let i = effectiveSquaresPerSide - 2; i >= 0; i--) {
			positions.push({ x: i * gap, y: size - squareSize });
		}

		// Left edge: bottom to top (skip first and last corners)
		for (let i = effectiveSquaresPerSide - 2; i > 0; i--) {
			positions.push({ x: 0, y: i * gap });
		}

		return positions;
	};

	const squares = generateSquarePositions();
	const totalSquares = squares.length;
	const animationDuration = 1.5; // Total time for one full loop

	return (
		<div
			className={cn("relative", className)}
			style={{ width: size, height: size }}
		>
			{squares.map((square, index) => (
				<motion.div
					animate={{
						opacity: [0.15, 0.15, 1, 1, 0.15, 0.15],
					}}
					className="absolute bg-current"
					key={index}
					style={{
						width: squareSize,
						height: squareSize,
						left: square.x,
						top: square.y,
						borderRadius: squareSize * 0.2,
					}}
					transition={{
						duration: animationDuration,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: (index / totalSquares) * animationDuration,
						times: [0, 0.1, 0.2, 0.3, 0.4, 1],
					}}
				/>
			))}
		</div>
	);
};
