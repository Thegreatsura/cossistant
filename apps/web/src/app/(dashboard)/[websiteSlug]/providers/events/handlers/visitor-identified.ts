import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { DashboardRealtimeContext } from "../types";

type VisitorIdentifiedEvent = RealtimeEvent<"visitorIdentified">;

export const handleVisitorIdentified = ({
        event,
        context,
}: {
        event: VisitorIdentifiedEvent;
        context: DashboardRealtimeContext;
}) => {
        context.queryNormalizer.setNormalizedData(event.payload.visitor);
};
