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

export function ParticipantRequestedActivity({
	event,
	timestamp,
}: EventActivityProps) {
	const text = (
		<>
			<span className="font-semibold">{event.actorName}</span> requested a team
			member to join
		</>
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
