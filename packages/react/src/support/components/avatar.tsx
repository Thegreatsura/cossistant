import { Facehash } from "facehash";
import type { ReactElement } from "react";

import {
	AvatarFallback,
	AvatarImage,
	Avatar as AvatarPrimitive,
} from "../../primitives/avatar";
import { cn } from "../utils";
import { CossistantLogo } from "./cossistant-branding";
import { getAgentStatus, OnlineIndicator } from "./online-indicator";

/**
 * Default Cossistant theme colors for avatar fallbacks.
 * These use the Tailwind classes defined in support.css.
 */
const DEFAULT_AVATAR_COLORS = [
	"bg-co-pink",
	"bg-co-blue",
	"bg-co-yellow",
	"bg-co-orange",
];

type AvatarProps = {
	className?: string;
	image?: string | null;
	name: string;
	/** Whether this avatar is for an AI agent */
	isAI?: boolean;
	/** Whether to show the background circle (default: true) */
	showBackground?: boolean;
	/**
	 * Tailwind class array for Facehash background colors.
	 * Defaults to Cossistant theme colors (pink, blue, yellow, orange).
	 * @example ["bg-pink-500", "bg-blue-500", "bg-green-500"]
	 */
	colorClasses?: string[];
	/**
	 * Last seen timestamp for the agent. When provided, shows a status indicator:
	 * - Green (online): seen within last 15 minutes
	 * - Orange (away): seen within last hour
	 * Only shown for non-AI agents.
	 */
	lastSeenAt?: string | null;
};

/**
 * Renders a squared avatar with graceful fallbacks using Facehash when no
 * image is available.
 *
 * For AI agents without an image, displays the Cossistant logo without
 * a background.
 */
export function Avatar({
	className,
	image,
	name,
	isAI = false,
	showBackground = true,
	colorClasses = DEFAULT_AVATAR_COLORS,
	lastSeenAt,
}: AvatarProps): ReactElement {
	const agentStatus = isAI ? "offline" : getAgentStatus(lastSeenAt);

	// AI agent without image: show logo in avatar box (only in avatar-stack context)
	// or at full size when used standalone
	if (isAI && !image) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-md bg-co-background-200 dark:bg-co-background-500",
					className
				)}
			>
				<CossistantLogo className="h-1/2 w-1/2" />
			</div>
		);
	}

	// AI agent with image: show image in a square
	if (isAI && image) {
		return (
			<AvatarPrimitive
				className={cn(
					"flex size-9 items-center justify-center overflow-clip rounded-md bg-co-background-200 dark:bg-co-background-500",
					className
				)}
			>
				<AvatarImage alt={name} src={image} />
				<AvatarFallback className="size-full">
					<Facehash
						className="size-full"
						colorClasses={colorClasses}
						interactive={false}
						name={name}
						showInitial={false}
						size="100%"
					/>
				</AvatarFallback>
			</AvatarPrimitive>
		);
	}

	return (
		<div className={cn("relative", className)}>
			<AvatarPrimitive
				className={cn(
					"flex size-full items-center justify-center overflow-clip rounded-md bg-co-background-200 dark:bg-co-background-500"
				)}
			>
				{image && <AvatarImage alt={name} src={image} />}
				<AvatarFallback className="size-full">
					<Facehash
						className="size-full"
						colorClasses={colorClasses}
						interactive={false}
						name={name}
						showInitial={false}
						size="100%"
					/>
				</AvatarFallback>
			</AvatarPrimitive>
			<OnlineIndicator
				className="-bottom-1 right-0.5"
				size={8}
				status={agentStatus}
			/>
		</div>
	);
}
