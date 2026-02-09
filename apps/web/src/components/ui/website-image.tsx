"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type WebsiteImageProps = {
	name: string;
	logoUrl: string | null | undefined;
	className?: string;
};

function WebsiteImage({ name, logoUrl, className }: WebsiteImageProps) {
	const initial = name.charAt(0).toUpperCase();

	return (
		<div
			className={cn(
				"relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-background-200",
				className
			)}
		>
			{logoUrl ? (
				<Image
					alt={name}
					className="size-full object-contain"
					fill
					src={logoUrl}
				/>
			) : (
				<span className="font-medium font-mono text-muted-foreground text-xs leading-none">
					{initial}
				</span>
			)}
		</div>
	);
}

export { WebsiteImage };
