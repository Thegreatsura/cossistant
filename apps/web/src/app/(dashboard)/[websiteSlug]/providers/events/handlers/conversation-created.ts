import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { prependConversationHeaderInCache } from "@/data/conversation-header-cache";
import { forEachConversationHeadersQuery } from "./utils/conversation-headers";
import type { DashboardRealtimeContext } from "../types";

type ConversationCreatedEvent = RealtimeEvent<"CONVERSATION_CREATED">;

export function handleConversationCreated({
        event,
        context,
}: {
        event: ConversationCreatedEvent;
        context: DashboardRealtimeContext;
}) {
        if (event.websiteId !== context.website.id) {
                return;
        }

        const { header } = event.payload;

        context.queryNormalizer.setNormalizedData(header);

        forEachConversationHeadersQuery(context.queryClient, context.website.slug, (queryKey) => {
                prependConversationHeaderInCache(context.queryClient, queryKey, header);
        });
}
