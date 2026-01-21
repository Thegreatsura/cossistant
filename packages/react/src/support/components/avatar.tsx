import type { ReactElement } from "react";

import {
	AvatarFallback,
	AvatarImage,
	Avatar as AvatarPrimitive,
} from "../../primitives/avatar";
import { cn } from "../utils";
import { CossistantLogo } from "./cossistant-branding";

type AvatarProps = {
	className?: string;
	image?: string | null;
	name: string;
	/** Whether this avatar is for an AI agent */
	isAI?: boolean;
	/** Whether to show the background circle (default: true) */
	showBackground?: boolean;
};

/**
 * Renders a circular avatar with graceful fallbacks when no image is
 * available.
 *
 * For AI agents without an image, displays the Cossistant logo without
 * a background circle.
 */
export function Avatar({
	className,
	image,
	name,
	isAI = false,
	showBackground = true,
}: AvatarProps): ReactElement {
	// AI agent without image: show logo without circle background
	if (isAI && !image) {
		return (
			<div
				className={cn(
					"flex items-center justify-center",
					showBackground &&
						"rounded-full bg-co-background-200 dark:bg-co-background-500",
					className
				)}
			>
				<CossistantLogo className="h-[60%] min-h-3 w-[60%] min-w-3" />
			</div>
		);
	}

	return (
		<AvatarPrimitive
			className={cn(
				"flex size-9 items-center justify-center overflow-clip rounded-full bg-co-background-200 dark:bg-co-background-500",
				className
			)}
		>
			{image && <AvatarImage alt={name} src={image} />}
			<AvatarFallback className="font-medium text-xs" name={name} />
		</AvatarPrimitive>
	);
}
