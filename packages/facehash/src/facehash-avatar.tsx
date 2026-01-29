import * as React from "react";
import { FACES } from "./faces";
import {
	type ColorPalette,
	DEFAULT_COLORS,
	DEFAULT_COLORS_DARK,
	DEFAULT_COLORS_LIGHT,
} from "./utils/colors";
import { stringHash } from "./utils/hash";
import { mergeRefs } from "./utils/merge-refs";

export interface FacehashAvatarProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
	/**
	 * The name used to generate a deterministic face and color.
	 * Same name always produces the same avatar.
	 */
	name: string;

	/**
	 * Custom color palette for backgrounds.
	 * Defaults to Tailwind-inspired colors.
	 */
	colors?: ColorPalette;

	/**
	 * Colors to use in light mode (lower contrast backgrounds).
	 * If not provided, uses `colors` palette.
	 */
	colorsLight?: ColorPalette;

	/**
	 * Colors to use in dark mode (higher contrast backgrounds).
	 * If not provided, uses `colors` palette.
	 */
	colorsDark?: ColorPalette;

	/**
	 * Whether to show the first letter of the name below the face.
	 * @default true
	 */
	showInitial?: boolean;

	/**
	 * The color scheme to use. If not set, uses CSS media query.
	 * Set to "light" or "dark" to force a specific scheme.
	 */
	colorScheme?: "light" | "dark" | "auto";

	/**
	 * Whether to apply the 3D sphere effect with rotation.
	 * @default true
	 */
	enable3D?: boolean;
}

/**
 * FacehashAvatar - A fun, deterministic avatar component.
 *
 * Renders a unique face based on the provided name, with consistent
 * results for the same input. Completely unstyled - bring your own CSS.
 *
 * @example
 * ```tsx
 * <FacehashAvatar name="John Doe" className="w-10 h-10 rounded-full" />
 * ```
 */
export const FacehashAvatar = React.forwardRef<
	HTMLDivElement,
	FacehashAvatarProps
>(
	(
		{
			name,
			colors = DEFAULT_COLORS,
			colorsLight = DEFAULT_COLORS_LIGHT,
			colorsDark = DEFAULT_COLORS_DARK,
			showInitial = true,
			colorScheme = "auto",
			enable3D = true,
			className,
			style,
			...props
		},
		ref
	) => {
		const containerRef = React.useRef<HTMLDivElement>(null);

		// Generate deterministic values from name
		const { FaceComponent, colorIndex, transform } = React.useMemo(() => {
			const hash = stringHash(name);

			const _FaceComponent = FACES[hash % FACES.length];
			const _colorIndex = hash % colors.length;

			// Define different sphere positions (angles in degrees)
			const spherePositions = [
				{ rotateX: -10, rotateY: 10 }, // down-right
				{ rotateX: 10, rotateY: 10 }, // up-right
				{ rotateX: 10, rotateY: 0 }, // up
				{ rotateX: 0, rotateY: 10 }, // right
				{ rotateX: -10, rotateY: 0 }, // down
				{ rotateX: 0, rotateY: 0 }, // center
				{ rotateX: 0, rotateY: -10 }, // left
				{ rotateX: -10, rotateY: -10 }, // down-left
				{ rotateX: 10, rotateY: -10 }, // up-left
			];

			const position = spherePositions[hash % spherePositions.length] ?? {
				rotateX: 0,
				rotateY: 0,
			};

			const _transform = enable3D
				? `rotateX(${position.rotateX}deg) rotateY(${position.rotateY}deg) translateZ(8px)`
				: undefined;

			return {
				FaceComponent: _FaceComponent ?? FACES[0],
				colorIndex: _colorIndex,
				transform: _transform,
			};
		}, [name, colors.length, enable3D]);

		// Get the appropriate color based on color scheme
		const backgroundColor = React.useMemo(() => {
			if (colorScheme === "light") {
				return colorsLight[colorIndex] ?? colors[colorIndex];
			}
			if (colorScheme === "dark") {
				return colorsDark[colorIndex] ?? colors[colorIndex];
			}
			// Auto mode - use CSS custom properties
			return;
		}, [colorScheme, colorIndex, colors, colorsLight, colorsDark]);

		// For auto mode, we use CSS custom properties
		const cssVars = React.useMemo(() => {
			if (colorScheme !== "auto") {
				return {};
			}

			return {
				"--facehash-bg-light": colorsLight[colorIndex] ?? colors[colorIndex],
				"--facehash-bg-dark": colorsDark[colorIndex] ?? colors[colorIndex],
			} as React.CSSProperties;
		}, [colorScheme, colorIndex, colors, colorsLight, colorsDark]);

		const initial = name.charAt(0).toUpperCase();

		return (
			<div
				className={className}
				data-color-scheme={colorScheme}
				data-facehash=""
				ref={mergeRefs([ref, containerRef])}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					containerType: "size",
					backgroundColor: colorScheme === "auto" ? undefined : backgroundColor,
					...(enable3D && {
						perspective: "500px",
						transformStyle: "preserve-3d",
					}),
					...cssVars,
					...style,
				}}
				{...props}
			>
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
						transform,
						transformStyle: enable3D ? "preserve-3d" : undefined,
					}}
				>
					{/* Face SVG - takes up ~60% width, auto height */}
					<FaceComponent
						style={{
							width: "60%",
							height: "auto",
							maxWidth: "90%",
							maxHeight: "40%",
						}}
					/>

					{/* Initial letter - positioned below the face */}
					{showInitial && (
						<span
							data-facehash-initial=""
							style={{
								marginTop: "8%",
								fontSize: "26cqw", // Container query width units
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

FacehashAvatar.displayName = "FacehashAvatar";
