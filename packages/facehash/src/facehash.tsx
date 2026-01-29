import * as React from "react";
import { FACES } from "./faces";
import { stringHash } from "./utils/hash";

// ============================================================================
// Types
// ============================================================================

export type Intensity3D = "none" | "subtle" | "medium" | "dramatic";
export type Variant = "gradient" | "solid";

export interface FacehashProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	/**
	 * String to generate a deterministic face from.
	 * Same string always produces the same face.
	 */
	name: string;

	/**
	 * Size in pixels or CSS units.
	 * @default 40
	 */
	size?: number | string;

	/**
	 * Background style.
	 * - "gradient": Adds gradient overlay (default)
	 * - "solid": Plain background color
	 * @default "gradient"
	 */
	variant?: Variant;

	/**
	 * 3D effect intensity.
	 * @default "medium"
	 */
	intensity3d?: Intensity3D;

	/**
	 * Enable hover interaction.
	 * When true, face "looks straight" on hover.
	 * @default false
	 */
	interactive?: boolean;

	/**
	 * Show first letter of name below the face.
	 * @default true
	 */
	showInitial?: boolean;

	/**
	 * Hex color array for inline styles.
	 * Use this OR colorClasses, not both.
	 */
	colors?: string[];

	/**
	 * Tailwind class array for background colors.
	 * Example: ["bg-pink-500 dark:bg-pink-600", "bg-blue-500 dark:bg-blue-600"]
	 * Use this OR colors, not both.
	 */
	colorClasses?: string[];

	/**
	 * Custom gradient overlay class (Tailwind).
	 * When provided, replaces the default pure CSS gradient.
	 * Only used when variant="gradient".
	 */
	gradientOverlayClass?: string;
}

// ============================================================================
// Constants
// ============================================================================

const INTENSITY_PRESETS = {
	none: {
		rotateRange: 0,
		translateZ: 0,
		perspective: "none",
	},
	subtle: {
		rotateRange: 5,
		translateZ: 4,
		perspective: "800px",
	},
	medium: {
		rotateRange: 10,
		translateZ: 8,
		perspective: "500px",
	},
	dramatic: {
		rotateRange: 15,
		translateZ: 12,
		perspective: "300px",
	},
} as const;

const SPHERE_POSITIONS = [
	{ x: -1, y: 1 }, // down-right
	{ x: 1, y: 1 }, // up-right
	{ x: 1, y: 0 }, // up
	{ x: 0, y: 1 }, // right
	{ x: -1, y: 0 }, // down
	{ x: 0, y: 0 }, // center
	{ x: 0, y: -1 }, // left
	{ x: -1, y: -1 }, // down-left
	{ x: 1, y: -1 }, // up-left
] as const;

// Default gradient as pure CSS (works without Tailwind)
// Matches: bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,_COLOR_0%,_transparent_60%)]
// Light mode: white glow in center, Dark mode: dark overlay in center
const DEFAULT_GRADIENT_STYLE: React.CSSProperties = {
	background:
		"radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)",
};

// ============================================================================
// Component
// ============================================================================

/**
 * Facehash - Deterministic avatar faces from any string.
 *
 * @example
 * ```tsx
 * // With Tailwind classes
 * <Facehash
 *   name="John"
 *   colorClasses={["bg-pink-500", "bg-blue-500"]}
 * />
 *
 * // With hex colors
 * <Facehash
 *   name="John"
 *   colors={["#ec4899", "#3b82f6"]}
 * />
 *
 * // Plain color (no gradient)
 * <Facehash name="John" variant="solid" />
 * ```
 */
export const Facehash = React.forwardRef<HTMLDivElement, FacehashProps>(
	(
		{
			name,
			size = 40,
			variant = "gradient",
			intensity3d = "medium",
			interactive = true,
			showInitial = true,
			colors,
			colorClasses,
			gradientOverlayClass,
			className,
			style,
			onMouseEnter,
			onMouseLeave,
			...props
		},
		ref
	) => {
		const [isHovered, setIsHovered] = React.useState(false);

		// Generate deterministic values from name
		const { FaceComponent, colorIndex, rotation } = React.useMemo(() => {
			const hash = stringHash(name);
			const faceIndex = hash % FACES.length;
			const colorsLength = colorClasses?.length ?? colors?.length ?? 1;
			const _colorIndex = hash % colorsLength;
			const positionIndex = hash % SPHERE_POSITIONS.length;
			const position = SPHERE_POSITIONS[positionIndex] ?? { x: 0, y: 0 };

			return {
				FaceComponent: FACES[faceIndex] ?? FACES[0],
				colorIndex: _colorIndex,
				rotation: position,
			};
		}, [name, colors?.length, colorClasses?.length]);

		// Get intensity preset
		const preset = INTENSITY_PRESETS[intensity3d];

		// Calculate 3D transform
		const transform = React.useMemo(() => {
			if (intensity3d === "none") {
				return;
			}

			const rotateX =
				isHovered && interactive ? 0 : rotation.x * preset.rotateRange;
			const rotateY =
				isHovered && interactive ? 0 : rotation.y * preset.rotateRange;

			return `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${preset.translateZ}px)`;
		}, [intensity3d, isHovered, interactive, rotation, preset]);

		// Size style
		const sizeValue = typeof size === "number" ? `${size}px` : size;

		// Initial letter
		const initial = name.charAt(0).toUpperCase();

		// Background: either hex color (inline) or class
		const bgColorClass = colorClasses?.[colorIndex];
		const bgColorHex = colors?.[colorIndex];

		// Event handlers
		const handleMouseEnter = React.useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (interactive) {
					setIsHovered(true);
				}
				onMouseEnter?.(e);
			},
			[interactive, onMouseEnter]
		);

		const handleMouseLeave = React.useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (interactive) {
					setIsHovered(false);
				}
				onMouseLeave?.(e);
			},
			[interactive, onMouseLeave]
		);

		return (
			// biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover effect is purely cosmetic
			// biome-ignore lint/a11y/noStaticElementInteractions: This is a decorative avatar component
			<div
				className={[bgColorClass, className].filter(Boolean).join(" ")}
				data-facehash=""
				data-interactive={interactive || undefined}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				ref={ref}
				style={{
					// Size
					width: sizeValue,
					height: sizeValue,
					// Layout
					position: "relative",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					overflow: "hidden",
					// Container for cqw units
					containerType: "size",
					// 3D setup
					...(intensity3d !== "none" && {
						perspective: preset.perspective,
						transformStyle: "preserve-3d",
					}),
					// Background color (hex) - only if no colorClasses
					...(bgColorHex && !bgColorClass && { backgroundColor: bgColorHex }),
					// User styles (last to allow overrides)
					...style,
				}}
				{...props}
			>
				{/* Gradient overlay */}
				{variant === "gradient" && (
					<div
						className={gradientOverlayClass}
						data-facehash-gradient=""
						style={{
							position: "absolute",
							inset: 0,
							pointerEvents: "none",
							zIndex: 1,
							// Use default pure CSS gradient if no class provided
							...(gradientOverlayClass ? {} : DEFAULT_GRADIENT_STYLE),
						}}
					/>
				)}

				{/* Face container with 3D transform */}
				<div
					data-facehash-face=""
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 2,
						transform,
						transformStyle: intensity3d !== "none" ? "preserve-3d" : undefined,
						transition: interactive
							? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
							: undefined,
						// Default to black text/icons for contrast on colored backgrounds
						color: "#000000",
					}}
				>
					{/* Face SVG */}
					<FaceComponent
						style={{
							width: "60%",
							height: "auto",
							maxWidth: "90%",
							maxHeight: "40%",
						}}
					/>

					{/* Initial letter */}
					{showInitial && (
						<span
							data-facehash-initial=""
							style={{
								marginTop: "8%",
								fontSize: "26cqw",
								lineHeight: 1,
								fontFamily: "monospace",
								fontWeight: "bold",
							}}
						>
							{initial}
						</span>
					)}
				</div>
			</div>
		);
	}
);

Facehash.displayName = "Facehash";
