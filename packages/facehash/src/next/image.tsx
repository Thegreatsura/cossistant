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
};

/**
 * Static Facehash image component for use with ImageResponse.
 * Uses only Satori-compatible CSS (flexbox, no transforms).
 */
export function FacehashImage({
	data,
	backgroundColor,
	size,
	variant,
	showInitial,
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

			{/* Face container */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
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
