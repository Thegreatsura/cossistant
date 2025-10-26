import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import type { ReactElement, ReactNode } from "react";
import { useRenderElement } from "../../utils/use-render-element";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { CossistantLogo } from "./cossistant-branding";

type AvatarStackProps = {
	humanAgents: AvailableHumanAgent[];
	aiAgents: AvailableAIAgent[];
	hideBranding?: boolean;
	hideDefaultAIAgent?: boolean;
	className?: string;
	/** Size of avatars (default: 44px) */
	size?: number;
	/** Space between avatars (default: 28px) */
	spacing?: number;
	/** Gap width between avatars (default: 2px) */
	gapWidth?: number;
};

export const AvatarStackItem = ({
	children,
	index,
	size = 44,
	spacing = 28,
	gapWidth = 2,
	className,
}: {
	children: ReactNode;
	index: number;
	size?: number;
	spacing?: number;
	gapWidth?: number;
	className?: string;
}): ReactElement | null => {
	const isFirst = index === 0;

	// Calculate the circle radius for the mask cutout
	const circleRadius = size * 0.5;
	const cutoutRadius = circleRadius + gapWidth; // Add gap width to create visible border
	const cutoutPosition = `${circleRadius - spacing}px`;

	return useRenderElement(
		"div",
		{ className },
		{
			props: {
				className: cn(
					"relative grid place-items-center",
					!isFirst && "[mask-repeat:no-repeat] [mask-size:100%_100%]"
				),
				style: {
					width: `${size}px`,
					height: `${size}px`,
					// Apply mask only to non-first items
					...(isFirst
						? {}
						: {
								mask: `radial-gradient(${cutoutRadius}px ${cutoutRadius}px at ${cutoutPosition} 50%, transparent ${cutoutRadius}px, white ${cutoutRadius}px)`,
								WebkitMask: `radial-gradient(${cutoutRadius}px ${cutoutRadius}px at ${cutoutPosition} 50%, transparent ${cutoutRadius}px, white ${cutoutRadius}px)`,
							}),
				},
				children,
			},
		}
	);
};

/**
 * Displays a compact row of agent avatars with optional branding and overflow
 * counts.
 */
export function AvatarStack({
	humanAgents,
	aiAgents,
	hideBranding = false,
	hideDefaultAIAgent = true,
	className,
	size = 44,
	spacing = 28,
	gapWidth = 3,
}: AvatarStackProps): ReactElement | null {
	const displayedHumanAgents = humanAgents.slice(0, 2);
	const remainingHumanAgentsCount = Math.max(0, humanAgents.length - 2);

	// Create array of all items to display
	const items = [
		...displayedHumanAgents.map((agent) => ({
			type: "human" as const,
			agent,
		})),
		...(remainingHumanAgentsCount > 0
			? [
					{
						type: "count" as const,
						count: remainingHumanAgentsCount,
					},
				]
			: []),
		...(hideDefaultAIAgent
			? []
			: [
					{
						type: "ai" as const,
						agent: aiAgents[0],
					},
				]),
	];

	return useRenderElement(
		"div",
		{ className },
		{
			props: {
				className: "inline-grid items-center",
				style: {
					gridTemplateColumns: `repeat(${items.length}, ${spacing}px)`,
				},
				children: items.map((item, index) => (
					<AvatarStackItem
						gapWidth={gapWidth}
						index={index}
						key={`avatar-${index}`}
						size={size}
						spacing={spacing}
					>
						{item.type === "human" && (
							<Avatar
								className={cn("size-full")}
								image={item.agent.image}
								name={item.agent.name}
							/>
						)}
						{item.type === "count" && (
							<div className="flex size-full items-center justify-center rounded-full bg-co-background-200 font-medium text-co-text-900 text-sm dark:bg-co-background-500">
								+{item.count}
							</div>
						)}
						{item.type === "ai" && (
							<div className="flex size-full items-center justify-center rounded-full bg-co-background-200 dark:bg-co-background-600">
								<CossistantLogo className="h-[50%] min-h-4 w-[50%] min-w-4" />
							</div>
						)}
					</AvatarStackItem>
				)),
			},
		}
	);
}
