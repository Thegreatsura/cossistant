"use client";

import type { CSSProperties, RefObject } from "react";
import { useMemo, useRef } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { cn } from "@/lib/utils";

type PageContentProps = {
	children: React.ReactNode;
	className?: string;
	ref?: RefObject<HTMLDivElement | null>;
};

export const PageContent = ({ children, className, ref }: PageContentProps) => {
	const internalRef = useRef<HTMLDivElement>(null);
	const scrollFadeState = useScrollFade(internalRef.current);
	const actualRef = ref || internalRef;

	// Memoize the mask style to avoid recreating on every render
	const maskStyle = useMemo<CSSProperties>(() => {
		const { showTopFade, showBottomFade } = scrollFadeState;

		const hasAnyFade = showTopFade || showBottomFade;
		if (!hasAnyFade) {
			return {};
		}

		const maskHeight = "32px";
		const scrollbarWidth = "8px";

		let maskImage = "";

		if (showTopFade && showBottomFade) {
			// Both top and bottom fade
			maskImage = `linear-gradient(to bottom, transparent, black ${maskHeight}, black calc(100% - ${maskHeight}), transparent), linear-gradient(black, black)`;
		} else if (showTopFade) {
			// Only top fade
			maskImage = `linear-gradient(to bottom, transparent, black ${maskHeight}), linear-gradient(black, black)`;
		} else if (showBottomFade) {
			// Only bottom fade
			maskImage = `linear-gradient(to bottom, black calc(100% - ${maskHeight}), transparent), linear-gradient(black, black)`;
		}

		const maskSize = `calc(100% - ${scrollbarWidth}) 100%, ${scrollbarWidth} 100%`;
		const maskPosition = "0 0, 100% 0";
		const maskRepeat = "no-repeat, no-repeat";

		return {
			maskImage,
			maskSize,
			maskPosition,
			maskRepeat,
			WebkitMaskImage: maskImage,
			WebkitMaskSize: maskSize,
			WebkitMaskPosition: maskPosition,
			WebkitMaskRepeat: maskRepeat,
		};
	}, [scrollFadeState.showTopFade, scrollFadeState.showBottomFade]);

	return (
		<div
			className={cn(
				"scrollbar-thin scrollbar-thumb-background-500 scrollbar-track-background-100 relative flex h-full flex-1 flex-col overflow-y-auto p-4 pt-14",
				className
			)}
			ref={actualRef}
			style={maskStyle}
		>
			{children}
		</div>
	);
};
