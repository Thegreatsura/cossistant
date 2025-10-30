"use client";

import { getImageProps } from "next/image";
import type { ReactNode } from "react";

type BackgroundImageProps = {
	/**
	 * Large image source URL (for screens >= 1440px)
	 */
	largeSrc: string;
	/**
	 * Medium image source URL (for screens >= 768px)
	 */
	mediumSrc: string;
	/**
	 * Small image source URL (for screens >= 320px)
	 */
	smallSrc: string;
	/**
	 * Alt text for the image
	 */
	alt?: string;
	/**
	 * Image quality for large image (0-100)
	 */
	largeQuality?: number;
	/**
	 * Image quality for medium image (0-100)
	 */
	mediumQuality?: number;
	/**
	 * Image quality for small image (0-100)
	 */
	smallQuality?: number;
	/**
	 * Width of large image
	 */
	largeWidth?: number;
	/**
	 * Height of large image
	 */
	largeHeight?: number;
	/**
	 * Width of medium image
	 */
	mediumWidth?: number;
	/**
	 * Height of medium image
	 */
	mediumHeight?: number;
	/**
	 * Width of small image
	 */
	smallWidth?: number;
	/**
	 * Height of small image
	 */
	smallHeight?: number;
	/**
	 * Additional CSS classes for the picture element
	 */
	className?: string;
	/**
	 * Additional CSS classes for the img element
	 */
	imgClassName?: string;
	/**
	 * Whether to display in portrait orientation on mobile
	 */
	portraitOnMobile?: boolean;
};

/**
 * Reusable background image component that handles responsive image sources
 * with Next.js Image optimization. Supports portrait orientation on mobile.
 */
export function BackgroundImage({
	largeSrc,
	mediumSrc,
	smallSrc,
	alt = "Background",
	largeQuality = 90,
	mediumQuality = 85,
	smallQuality = 80,
	largeWidth = 1920,
	largeHeight = 1080,
	mediumWidth = 1440,
	mediumHeight = 810,
	smallWidth = 750,
	smallHeight = 422,
	className = "",
	imgClassName = "",
	portraitOnMobile = false,
}: BackgroundImageProps) {
	const common = {
		alt,
		sizes: "100vw",
	};

	const {
		props: { srcSet: large },
	} = getImageProps({
		...common,
		width: largeWidth,
		height: largeHeight,
		quality: largeQuality,
		src: largeSrc,
	});

	const {
		props: { srcSet: medium },
	} = getImageProps({
		...common,
		width: mediumWidth,
		height: mediumHeight,
		quality: mediumQuality,
		src: mediumSrc,
	});

	const {
		props: { srcSet: small, ...rest },
	} = getImageProps({
		...common,
		width: smallWidth,
		height: smallHeight,
		quality: smallQuality,
		src: smallSrc,
	});

	return (
		<picture className={`absolute inset-0 z-0 ${className}`}>
			<source media="(min-width: 1440px)" srcSet={large} />
			<source media="(min-width: 768px)" srcSet={medium} />
			<source media="(min-width: 320px)" srcSet={small} />
			<img
				{...rest}
				alt={alt}
				className={`size-full object-cover grayscale-50 ${
					portraitOnMobile ? "object-top md:object-center" : ""
				} ${imgClassName}`}
				height={largeHeight}
				style={{ width: "100%", height: "100%" }}
				width={largeWidth}
			/>
		</picture>
	);
}
