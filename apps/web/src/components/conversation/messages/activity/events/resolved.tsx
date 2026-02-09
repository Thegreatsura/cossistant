import { CircleCheck } from "lucide-react";
import type { ActivityIcon } from "../activity-wrapper";
import { ActivityWrapper } from "../activity-wrapper";
import type { EventActivityProps } from "../types";

function resolveEventIcon(event: EventActivityProps["event"]): ActivityIcon {
	if (event.actorType === "ai") {
		return { type: "logo" };
	}
	return {
		type: "avatar",
		name: event.actorName,
		image: event.actorImage,
	};
}

export function ResolvedActivity({ event, timestamp }: EventActivityProps) {
	const text = (
		<span className="flex items-center gap-1">
			<span className="font-semibold">{event.actorName}</span> resolved the
			conversation
		</span>
	);

	return (
		<ActivityWrapper
			icon={resolveEventIcon(event)}
			state="result"
			text={text}
			timestamp={timestamp}
		/>
	);
}
