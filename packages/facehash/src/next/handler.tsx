import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import {
	computeFacehash,
	DEFAULT_COLORS,
	getColor,
	type Variant,
} from "../core";
import { FacehashImage } from "./image";

// ============================================================================
// Types
// ============================================================================

export type FacehashHandlerOptions = {
	/**
	 * Default image size in pixels.
	 * Can be overridden via `?size=` query param.
	 * @default 400
	 */
	size?: number;

	/**
	 * Default background style.
	 * Can be overridden via `?variant=` query param.
	 * @default "gradient"
	 */
	variant?: Variant;

	/**
	 * Default for showing initial letter.
	 * Can be overridden via `?showInitial=` query param.
	 * @default true
	 */
	showInitial?: boolean;

	/**
	 * Default color palette (hex colors).
	 * Can be overridden via `?colors=` query param (comma-separated).
	 * @default ["#ec4899", "#f59e0b", "#3b82f6", "#f97316", "#10b981"]
	 */
	colors?: string[];

	/**
	 * Cache-Control header value.
	 * Set to `null` to disable caching.
	 * @default "public, max-age=31536000, immutable"
	 */
	cacheControl?: string | null;
};

export type FacehashHandler = {
	GET: (request: NextRequest) => Promise<ImageResponse>;
};

// ============================================================================
// Helper Functions
// ============================================================================

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{3,8}$/;

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
	if (value === null) {
		return defaultValue;
	}
	return value === "true" || value === "1";
}

function parseNumber(
	value: string | null,
	defaultValue: number,
	min = 1,
	max = 2000
): number {
	if (value === null) {
		return defaultValue;
	}
	const num = Number.parseInt(value, 10);
	if (Number.isNaN(num)) {
		return defaultValue;
	}
	return Math.min(Math.max(num, min), max);
}

function parseColors(value: string | null): string[] | undefined {
	if (!value) {
		return;
	}
	const colors = value
		.split(",")
		.map((c) => c.trim())
		.filter((c) => HEX_COLOR_REGEX.test(c));
	return colors.length > 0 ? colors : undefined;
}

function parseVariant(value: string | null): Variant | undefined {
	if (value === "gradient" || value === "solid") {
		return value;
	}
	return;
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Creates a Next.js route handler for generating Facehash avatar images.
 *
 * @example
 * ```ts
 * // app/api/avatar/route.ts
 * import { toFacehashHandler } from "facehash/next";
 *
 * export const { GET } = toFacehashHandler();
 * ```
 *
 * @example
 * ```ts
 * // With custom defaults
 * export const { GET } = toFacehashHandler({
 *   size: 200,
 *   variant: "solid",
 *   colors: ["#ff0000", "#00ff00", "#0000ff"],
 * });
 * ```
 *
 * Query parameters:
 * - `name` (required): String to generate avatar from
 * - `size`: Image size in pixels (default: 400)
 * - `variant`: "gradient" or "solid" (default: "gradient")
 * - `showInitial`: "true" or "false" (default: "true")
 * - `colors`: Comma-separated hex colors (e.g., "#ff0000,#00ff00")
 */
export function toFacehashHandler(
	options: FacehashHandlerOptions = {}
): FacehashHandler {
	const {
		size: defaultSize = 400,
		variant: defaultVariant = "gradient",
		showInitial: defaultShowInitial = true,
		colors: defaultColors = [...DEFAULT_COLORS],
		cacheControl = "public, max-age=31536000, immutable",
	} = options;

	async function GET(request: NextRequest): Promise<ImageResponse> {
		const searchParams = request.nextUrl.searchParams;

		// Parse name (required)
		const name = searchParams.get("name");
		if (!name) {
			return new ImageResponse(
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "#f3f4f6",
						color: "#6b7280",
						fontSize: 24,
						fontFamily: "sans-serif",
					}}
				>
					Missing ?name= parameter
				</div>,
				{
					width: defaultSize,
					height: defaultSize,
					status: 400,
					headers: {
						"Content-Type": "image/png",
					},
				}
			);
		}

		// Parse options from query params (override defaults)
		const size = parseNumber(searchParams.get("size"), defaultSize, 16, 2000);
		const variant = parseVariant(searchParams.get("variant")) ?? defaultVariant;
		const showInitial = parseBoolean(
			searchParams.get("showInitial"),
			defaultShowInitial
		);
		const colors = parseColors(searchParams.get("colors")) ?? defaultColors;

		// Compute facehash data
		const data = computeFacehash({
			name,
			colorsLength: colors.length,
		});

		// Get background color
		const backgroundColor = getColor(colors, data.colorIndex);

		// Build response headers
		const headers: Record<string, string> = {
			"Content-Type": "image/png",
		};

		if (cacheControl) {
			headers["Cache-Control"] = cacheControl;
		}

		// Generate image
		return new ImageResponse(
			<FacehashImage
				backgroundColor={backgroundColor}
				data={data}
				rotation={data.rotation}
				showInitial={showInitial}
				size={size}
				variant={variant}
			/>,
			{
				width: size,
				height: size,
				headers,
			}
		);
	}

	return { GET };
}
