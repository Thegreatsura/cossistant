import { ActivityWrapper } from "../activity-wrapper";
import type { ToolActivityProps } from "../types";

export function FallbackToolActivity({
	toolCall,
	timestamp,
	showIcon = true,
	icon,
}: ToolActivityProps) {
	return (
		<ActivityWrapper
			icon={icon}
			showIcon={showIcon}
			state={toolCall.state}
			text={toolCall.summaryText}
			timestamp={timestamp}
		/>
	);
}
