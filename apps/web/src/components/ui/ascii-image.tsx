"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

type AsciiImageProps = {
	src: string;
	alt: string;
	className?: string;
	asciiOpacity?: number;
	characters?: string;
	resolution?: number;
	noiseSpeed?: number;
	noiseIntensity?: number;
	priority?: boolean;
};

// Default character set sorted by visual density (dense to sparse)
const DEFAULT_CHARACTERS = "@%#*+=-:;  ";

// Luminance weights for RGB to grayscale conversion (ITU-R BT.601)
const LUMINANCE_R = 0.299;
const LUMINANCE_G = 0.587;
const LUMINANCE_B = 0.114;

// Animation constants
const TARGET_FPS = 18;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Debounce delay for resize
const RESIZE_DEBOUNCE_MS = 150;

type CharacterGrid = {
	chars: string[];
	cols: number;
	rows: number;
	cellWidth: number;
	cellHeight: number;
};

type SampleOptions = {
	img: HTMLImageElement;
	containerWidth: number;
	containerHeight: number;
	resolution: number;
	characters: string;
};

/**
 * Samples pixels from an image and creates a grid of ASCII characters
 * based on luminance values
 */
function sampleImageToAscii({
	img,
	containerWidth,
	containerHeight,
	resolution,
	characters,
}: SampleOptions): CharacterGrid | null {
	if (!img.complete || img.naturalWidth === 0) {
		return null;
	}

	// Calculate grid dimensions based on resolution
	// resolution controls character density:
	// - 0.05 → very fine detail, tiny chars (~200 cols per 800px)
	// - 0.1 → fine detail (~130 cols per 800px)
	// - 0.15 → medium detail (~90 cols per 800px)
	// - 0.3 → coarse, larger chars (~45 cols per 800px)
	const cellSize = Math.max(4, Math.round(resolution * 60));
	const cols = Math.floor(containerWidth / cellSize);
	const rows = Math.floor(containerHeight / (cellSize * 2)); // Account for character aspect ratio (chars are ~2x taller than wide)

	if (cols <= 0 || rows <= 0) {
		return null;
	}

	// Create an offscreen canvas to sample the image
	const canvas = document.createElement("canvas");
	canvas.width = cols;
	canvas.height = rows;

	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) {
		return null;
	}

	// Draw the image scaled down to our grid size
	ctx.drawImage(img, 0, 0, cols, rows);

	// Get pixel data
	const imageData = ctx.getImageData(0, 0, cols, rows);
	const pixels = imageData.data;

	const chars: string[] = [];
	const charCount = characters.length;

	// Sample each pixel and map to a character
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const i = (y * cols + x) * 4;
			const r = pixels[i] ?? 0;
			const g = pixels[i + 1] ?? 0;
			const b = pixels[i + 2] ?? 0;
			const a = pixels[i + 3] ?? 255;

			// Calculate luminance (0-255)
			const luminance = LUMINANCE_R * r + LUMINANCE_G * g + LUMINANCE_B * b;

			// Adjust for alpha
			const adjustedLuminance = (luminance * a) / 255;

			// Map luminance to character index
			// Characters are sorted dense to sparse, so dark (low luminance) = first chars
			// We invert so that dark areas get dense characters
			const normalizedLuminance = adjustedLuminance / 255;
			const invertedLuminance = 1 - normalizedLuminance;
			const charIndex = Math.min(
				charCount - 1,
				Math.floor(invertedLuminance * charCount)
			);

			chars.push(characters[charIndex] ?? " ");
		}
	}

	return {
		chars,
		cols,
		rows,
		cellWidth: containerWidth / cols,
		cellHeight: containerHeight / rows,
	};
}

/**
 * Simple seeded random for consistent noise per character position
 */
function seededRandom(x: number, y: number, seed: number): number {
	const n =
		Math.sin(x * 12.9898 + y * 78.233 + seed * 43_758.5453) * 43_758.5453;
	return n - Math.floor(n);
}

/**
 * Canvas 2D ASCII renderer with animation
 */
function AsciiCanvas({
	grid,
	noiseSpeed,
	noiseIntensity,
	color,
	isVisible,
}: {
	grid: CharacterGrid;
	noiseSpeed: number;
	noiseIntensity: number;
	color: string;
	isVisible: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationRef = useRef<number>(0);
	const lastFrameTimeRef = useRef<number>(0);
	const timeRef = useRef<number>(0);

	const render = useCallback(
		(time: number) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				return;
			}

			const { chars, cols, rows, cellWidth, cellHeight } = grid;

			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Scale for retina (canvas is 2x the CSS size)
			ctx.save();
			ctx.scale(2, 2);

			// Set font - scale to fit cell while maintaining readability
			const fontSize = Math.max(4, Math.min(cellWidth * 0.9, cellHeight * 0.6));
			ctx.font = `${fontSize}px "SF Mono", "Fira Code", "Monaco", "Consolas", monospace`;
			ctx.fillStyle = color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			// Render each character with optional animation
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					const charIndex = y * cols + x;
					const char = chars[charIndex];

					if (!char || char === " ") {
						continue;
					}

					// Calculate base position (center of cell)
					let px = x * cellWidth + cellWidth / 2;
					let py = y * cellHeight + cellHeight / 2;

					// Apply subtle animation effects
					if (noiseIntensity > 0) {
						// Jitter effect - small random offset
						const jitterSeed = seededRandom(x, y, Math.floor(time * 0.003));
						const jitterX =
							(jitterSeed - 0.5) * noiseIntensity * cellWidth * 0.3;
						const jitterY =
							(seededRandom(y, x, Math.floor(time * 0.003)) - 0.5) *
							noiseIntensity *
							cellHeight *
							0.3;

						// Wave effect - sinusoidal displacement
						const wavePhase = time * noiseSpeed * 0.002;
						const waveX =
							Math.sin(y * 0.15 + wavePhase) * noiseIntensity * cellWidth * 0.2;
						const waveY =
							Math.cos(x * 0.15 + wavePhase * 0.7) *
							noiseIntensity *
							cellHeight *
							0.15;

						px += jitterX + waveX;
						py += jitterY + waveY;
					}

					ctx.fillText(char, px, py);
				}
			}

			// Restore canvas state (undo scale)
			ctx.restore();
		},
		[grid, color, noiseIntensity, noiseSpeed]
	);

	// Animation loop
	useEffect(() => {
		if (!isVisible) {
			return;
		}

		const animate = (timestamp: number) => {
			// Throttle to target FPS
			const elapsed = timestamp - lastFrameTimeRef.current;

			if (elapsed >= FRAME_INTERVAL) {
				lastFrameTimeRef.current = timestamp - (elapsed % FRAME_INTERVAL);
				timeRef.current = timestamp;
				render(timestamp);
			}

			animationRef.current = requestAnimationFrame(animate);
		};

		// Initial render
		render(0);

		// Start animation if we have noise effects
		if (noiseIntensity > 0) {
			animationRef.current = requestAnimationFrame(animate);
		}

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [render, isVisible, noiseIntensity]);

	// Set canvas size
	const width = grid.cols * grid.cellWidth;
	const height = grid.rows * grid.cellHeight;

	return (
		<canvas
			height={height * 2} // 2x for retina
			ref={canvasRef}
			style={{
				width: `${width}px`,
				height: `${height}px`,
			}}
			width={width * 2} // 2x for retina
		/>
	);
}

export function AsciiImage({
	src,
	alt,
	className,
	asciiOpacity = 0.25,
	characters = DEFAULT_CHARACTERS,
	resolution = 0.15,
	noiseSpeed = 0.15,
	noiseIntensity = 0.2,
	priority = false,
}: AsciiImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [grid, setGrid] = useState<CharacterGrid | null>(null);
	const [isClient, setIsClient] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const { resolvedTheme } = useTheme();

	// Ensure we're on the client
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Intersection Observer for visibility detection
	useEffect(() => {
		if (!containerRef.current) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					setIsVisible(entry.isIntersecting);
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(containerRef.current);

		return () => {
			observer.disconnect();
		};
	}, []);

	// Debounced resize handler
	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		const updateDimensions = () => {
			if (containerRef.current) {
				const { width, height } = containerRef.current.getBoundingClientRect();
				setDimensions({
					width: Math.floor(width),
					height: Math.floor(height),
				});
			}
		};

		const debouncedUpdate = () => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(updateDimensions, RESIZE_DEBOUNCE_MS);
		};

		// Initial update
		updateDimensions();

		window.addEventListener("resize", debouncedUpdate);

		return () => {
			window.removeEventListener("resize", debouncedUpdate);
			clearTimeout(timeoutId);
		};
	}, []);

	// Generate ASCII grid when image loads or dimensions change
	const regenerateGrid = useCallback(() => {
		if (!imgRef.current || dimensions.width === 0 || dimensions.height === 0) {
			return;
		}

		const newGrid = sampleImageToAscii({
			img: imgRef.current,
			containerWidth: dimensions.width,
			containerHeight: dimensions.height,
			resolution,
			characters,
		});

		if (newGrid) {
			setGrid(newGrid);
		}
	}, [dimensions.width, dimensions.height, resolution, characters]);

	// Regenerate on dimension changes
	useLayoutEffect(() => {
		regenerateGrid();
	}, [regenerateGrid]);

	// Handle image load
	const handleImageLoad = useCallback(
		(event: React.SyntheticEvent<HTMLImageElement>) => {
			imgRef.current = event.currentTarget;
			regenerateGrid();
		},
		[regenerateGrid]
	);

	// Determine text color based on theme
	const textColor = useMemo(
		() => (resolvedTheme === "dark" ? "#ffffff" : "#000000"),
		[resolvedTheme]
	);

	const canRenderAscii =
		isClient && grid && dimensions.width > 0 && dimensions.height > 0;

	return (
		<div
			className={cn("relative overflow-hidden", className)}
			ref={containerRef}
		>
			{/* Base Image (Layer 0) */}
			<Image
				alt={alt}
				className="absolute inset-0 h-full w-full object-cover"
				crossOrigin="anonymous"
				fill
				onLoad={handleImageLoad}
				priority={priority}
				src={src}
			/>

			{/* ASCII Overlay (Layer 1) */}
			{canRenderAscii && (
				<div
					className="pointer-events-none absolute inset-0 flex items-center justify-center"
					style={{
						opacity: asciiOpacity,
						mixBlendMode: resolvedTheme === "dark" ? "screen" : "multiply",
					}}
				>
					<AsciiCanvas
						color={textColor}
						grid={grid}
						isVisible={isVisible}
						noiseIntensity={noiseIntensity}
						noiseSpeed={noiseSpeed}
					/>
				</div>
			)}
		</div>
	);
}
