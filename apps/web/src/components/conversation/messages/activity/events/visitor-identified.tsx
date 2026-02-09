import type { ActivityIcon } from "../activity-wrapper";
import { ActivityWrapper } from "../activity-wrapper";
import type { EventActivityProps } from "../types";

export function VisitorIdentifiedActivity({
	event,
	timestamp,
}: EventActivityProps) {
	const icon: ActivityIcon = {
		type: "avatar",
		name: event.actorName,
		image: event.actorImage,
	};

	const text = (
		<>
			<span className="font-semibold">{event.actorName}</span> identified, new
			contact created
		</>
	);

	return (
		<ActivityWrapper
			icon={icon}
			state="result"
			text={text}
			timestamp={timestamp}
		/>
	);
}
