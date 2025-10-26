import type { ReactElement } from "react";

import {
	AvatarFallback,
	AvatarImage,
	Avatar as AvatarPrimitive,
} from "../../primitives/avatar";
import { cn } from "../utils";

type AvatarProps = {
	className?: string;
	image?: string | null;
	name: string;
};

/**
 * Renders a circular avatar with graceful fallbacks when no image is
 * available.
 */
export function Avatar({ className, image, name }: AvatarProps): ReactElement {
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
