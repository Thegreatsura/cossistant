import type { AnyRealtimeEvent } from "@cossistant/types/realtime-events";

function getTargetVisitorId(event: AnyRealtimeEvent): string | null {
  const payloadVisitorId = event.payload.visitorId;

  if (typeof payloadVisitorId === "string" && payloadVisitorId.length > 0) {
    return payloadVisitorId;
  }

  if (event.type === "messageCreated") {
    const messageVisitorId = event.payload.message.visitorId;

    if (typeof messageVisitorId === "string" && messageVisitorId.length > 0) {
      return messageVisitorId;
    }
  }

  return null;
}

export function shouldDeliverEvent(
  event: AnyRealtimeEvent,
  websiteId: string | null,
  visitorId: string | null,
): boolean {
  if (websiteId && event.payload.websiteId !== websiteId) {
    return false;
  }

  if (!visitorId) {
    return true;
  }

  const targetVisitorId = getTargetVisitorId(event);

  if (targetVisitorId && targetVisitorId !== visitorId) {
    return false;
  }

  return true;
}

export { getTargetVisitorId };
