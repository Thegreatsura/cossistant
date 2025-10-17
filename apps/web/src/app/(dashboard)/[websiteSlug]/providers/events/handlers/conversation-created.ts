import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { prependConversationHeaderInCache } from "@/data/conversation-header-cache";
import type { DashboardRealtimeContext } from "../types";
import { forEachConversationHeadersQuery } from "./utils/conversation-headers";

type ConversationCreatedEvent = RealtimeEvent<"conversationCreated">;

export function handleConversationCreated({
  event,
  context,
}: {
  event: ConversationCreatedEvent;
  context: DashboardRealtimeContext;
}) {
  if (event.payload.websiteId !== context.website.id) {
    return;
  }

  const { header } = event.payload;

  context.queryNormalizer.setNormalizedData(header);

  forEachConversationHeadersQuery(
    context.queryClient,
    context.website.slug,
    (queryKey) => {
      prependConversationHeaderInCache(context.queryClient, queryKey, header);
    },
  );
}
