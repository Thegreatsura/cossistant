import type { FacehashData, Variant } from "../core";
import { FACE_SVG_DATA } from "./faces-svg";

export type FacehashImageProps = {
	/** Computed facehash data */
	data: FacehashData;
	/** Background color (hex) */
	backgroundColor: string;
	/** Image size in pixels */
	size: number;
	/** Background style variant */
	variant: Variant;
	/** Show initial letter */
	showInitial: boolean;
	/** Rotation for 3D effect simulation */
	rotation: { x: number; y: number };
};

/**
 * Static Facehash image component for use with ImageResponse.
 * Uses only Satori-compatible CSS (flexbox, position offsets for 3D effect).
 */
export function FacehashImage({
	data,
	backgroundColor,
	size,
	variant,
	showInitial,
	rotation,
}: FacehashImageProps) {
	const { faceType, initial } = data;
	const svgData = FACE_SVG_DATA[faceType];

	// Calculate SVG dimensions based on viewBox
	const [, , vbWidth, vbHeight] = svgData.viewBox.split(" ").map(Number);
	const aspectRatio = (vbWidth ?? 1) / (vbHeight ?? 1);

	// Face takes up ~60% of the container width
	const faceWidth = size * 0.6;
	const faceHeight = faceWidth / aspectRatio;

	// Font size for initial (26% of size, matching cqw from React component)
	const fontSize = size * 0.26;

	// Calculate 3D effect offset (simulate looking direction)
	// rotation.x: -1 = looking down, 0 = center, 1 = looking up
	// rotation.y: -1 = looking left, 0 = center, 1 = looking right
	// We offset the face in the opposite direction to simulate the "looking" effect
	const offsetMagnitude = size * 0.05; // 5% of container size
	const offsetX = rotation.y * offsetMagnitude; // horizontal offset (positive = right)
	const offsetY = -rotation.x * offsetMagnitude; // vertical offset (positive = down, so negate)

	return (
		<div
			style={{
				width: size,
				height: size,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor,
				position: "relative",
			}}
		>
			{/* Gradient overlay */}
			{variant === "gradient" && (
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background:
							"radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)",
					}}
				/>
			)}

			{/* Face container with 3D position offset */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					// Apply position offset to simulate 3D "looking direction"
					marginLeft: offsetX,
					marginTop: offsetY,
				}}
			>
				{/* Face SVG */}
				<svg
					aria-label="Avatar face"
					fill="none"
					height={faceHeight}
					role="img"
					viewBox={svgData.viewBox}
					width={faceWidth}
					xmlns="http://www.w3.org/2000/svg"
				>
					{svgData.paths.map((d, i) => (
						<path d={d} fill="black" key={i} />
					))}
				</svg>

				{/* Initial letter */}
				{showInitial && (
					<span
						style={{
							marginTop: size * 0.08,
							fontSize,
							lineHeight: 1,
							fontFamily: "monospace",
							fontWeight: 700,
							color: "black",
						}}
					>
						{initial}
					</span>
				)}
			</div>
		</div>
	);
}
