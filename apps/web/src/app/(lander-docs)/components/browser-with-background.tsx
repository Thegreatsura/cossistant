"use client";

import { motion } from "motion/react";
import { getImageProps } from "next/image";
import type { ReactNode } from "react";

type BrowserWithBackgroundProps = {
	children?: ReactNode;
	containerClassName?: string;
	browserClassName?: string;
};

export function BrowserWithBackground({
	children,
	containerClassName = "",
	browserClassName = "",
}: BrowserWithBackgroundProps) {
	const common = {
		alt: "Cossistant Background",
		sizes: "100vw",
	};

	const {
		props: { srcSet: large },
	} = getImageProps({
		...common,
		width: 1920,
		height: 1080,
		quality: 90,
		src: "https://cdn.cossistant.com/landing/main-large.jpg",
	});

	const {
		props: { srcSet: medium },
	} = getImageProps({
		...common,
		width: 1440,
		height: 810,
		quality: 85,
		src: "https://cdn.cossistant.com/landing/main-medium.jpg",
	});

	const {
		props: { srcSet: small, ...rest },
	} = getImageProps({
		...common,
		width: 750,
		height: 422,
		quality: 80,
		src: "https://cdn.cossistant.com/landing/main-small.jpg",
	});

	return (
		<div
			className={`relative flex w-full items-center justify-center overflow-hidden ${containerClassName}`}
		>
			{/* Background Image */}
			<picture className="absolute inset-0 z-0">
				<source media="(min-width: 1440px)" srcSet={large} />
				<source media="(min-width: 768px)" srcSet={medium} />
				<source media="(min-width: 320px)" srcSet={small} />
				<img
					{...rest}
					alt="Cossistant Background"
					className="size-full object-cover grayscale-50"
					height={1080}
					style={{ width: "100%", height: "100%" }}
					width={1920}
				/>
			</picture>

			{/* Browser Window Container */}
			<div className="relative z-10 flex flex-1 items-center justify-center">
				<div
					className={`fake-browser-wrapper w-full max-w-[1450px] scale-90 overflow-hidden rounded-lg border border-primary/5 shadow-2xl ${browserClassName}`}
				>
					{/* iOS Browser Chrome */}
					<div className="flex h-full w-full flex-col overflow-hidden bg-background">
						{/* Browser Top Bar */}
						<div className="flex items-center justify-between gap-2 border-primary/10 border-b px-4 py-1">
							{/* Traffic Lights */}
							<div className="flex w-20 gap-2">
								<div className="size-2 rounded-full bg-red-500" />
								<div className="size-2 rounded-full bg-yellow-500" />
								<div className="size-2 rounded-full bg-green-500" />
							</div>
							{/* URL Bar */}
							<div className="ml-4 flex flex-1 items-center justify-center gap-2 bg-background px-3 py-1.5">
								<span className="rounded-md bg-background-400 px-2 py-1 text-primary/60 text-xs">
									https://cossistant.com/shadcn/inbox
								</span>
							</div>
							<div className="w-20" />
						</div>
						{/* Browser Content */}
						<div className="flex-1 bg-background">{children}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
