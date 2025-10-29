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
		<div className={`relative w-full overflow-hidden ${containerClassName}`}>
			{/* Background Image */}
			<picture className="absolute inset-0 z-0">
				<source media="(min-width: 1440px)" srcSet={large} />
				<source media="(min-width: 768px)" srcSet={medium} />
				<source media="(min-width: 320px)" srcSet={small} />
				<img
					{...rest}
					alt="Cossistant Background"
					className="size-full object-cover"
					height={1080}
					style={{ width: "100%", height: "100%" }}
					width={1920}
				/>
			</picture>

			{/* Browser Window Container */}
			<div className="relative z-10 flex items-center justify-center p-8">
				<div
					className={`w-full max-w-6xl ${browserClassName}`}
					style={{ aspectRatio: "16 / 10" }}
				>
					{/* iOS Browser Chrome */}
					<div className="flex size-full flex-col overflow-hidden rounded-lg border border-primary/10 bg-background shadow-2xl">
						{/* Browser Top Bar */}
						<div className="flex items-center gap-2 border-primary/10 border-b bg-background-100 px-4 py-1">
							{/* Traffic Lights */}
							<div className="flex gap-2">
								<div className="size-2 rounded-full bg-red-500" />
								<div className="size-2 rounded-full bg-yellow-500" />
								<div className="size-2 rounded-full bg-green-500" />
							</div>
							{/* URL Bar */}
							<div className="ml-4 flex flex-1 items-center gap-2 rounded-md bg-background px-3 py-1.5">
								<span className="font-mono text-primary/60 text-xs">
									cossistant.com/shadcn/inbox
								</span>
							</div>
						</div>
						{/* Browser Content */}
						<div className="flex-1 overflow-auto bg-background">{children}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
