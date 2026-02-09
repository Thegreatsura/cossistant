import { ActivityWrapper } from "../activity-wrapper";
import type { ToolActivityProps } from "../types";

export function FallbackToolActivity({
	toolCall,
	timestamp,
}: ToolActivityProps) {
	return (
		<ActivityWrapper
			state={toolCall.state}
			text={toolCall.summaryText}
			timestamp={timestamp}
		/>
	);
}
