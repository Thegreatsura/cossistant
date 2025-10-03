import type { CossistantClient } from "@cossistant/core";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type React from "react";
import { useMemo } from "react";
import { useSupport } from "../provider";
import { applyConversationSeenEvent } from "./seen-store";
import {
  applyConversationTypingEvent,
  clearTypingFromMessage,
} from "./typing-store";
import { useRealtime } from "./use-realtime";

type SupportRealtimeContext = {
  websiteId: string | null;
  visitorId: string | null;
  client: CossistantClient;
};

type SupportRealtimeProviderProps = {
  children: React.ReactNode;
};

/**
 * Bridges websocket events into the core client stores so support hooks stay
 * in sync without forcing refetches.
 */
export function SupportRealtimeProvider({
  children,
}: SupportRealtimeProviderProps) {
  const { website, client, visitor } = useSupport();

  const realtimeContext = useMemo<SupportRealtimeContext>(
    () => ({
      websiteId: website?.id ?? null,
      visitorId: visitor?.id ?? null,
      client,
    }),
    [website?.id, visitor?.id, client]
  );

  const events = useMemo(
    () => ({
      MESSAGE_CREATED: (
        _data: RealtimeEvent["payload"],
        {
          event,
          context,
        }: {
          event: RealtimeEvent<"MESSAGE_CREATED">;
          context: SupportRealtimeContext;
        }
      ) => {
        if (context.websiteId && event.websiteId !== context.websiteId) {
          return;
        }

        // Clear typing state when a message is sent
        clearTypingFromMessage(event);

        context.client.handleRealtimeEvent(event);
      },
      CONVERSATION_SEEN: (
        _data: RealtimeEvent["payload"],
        {
          event,
          context,
        }: {
          event: RealtimeEvent<"CONVERSATION_SEEN">;
          context: SupportRealtimeContext;
        }
      ) => {
        if (context.websiteId && event.websiteId !== context.websiteId) {
          return;
        }

        // Update the seen store so the UI reflects who has seen messages
        applyConversationSeenEvent(event);
      },
      CONVERSATION_TYPING: (
        _data: RealtimeEvent["payload"],
        {
          event,
          context,
        }: {
          event: RealtimeEvent<"CONVERSATION_TYPING">;
          context: SupportRealtimeContext;
        }
      ) => {
        if (context.websiteId && event.websiteId !== context.websiteId) {
          return;
        }

        // Update typing store, but ignore events from the current visitor (their own typing)
        applyConversationTypingEvent(event, {
          ignoreVisitorId: context.visitorId,
        });
      },
    }),
    []
  );

  useRealtime<SupportRealtimeContext>({
    context: realtimeContext,
    events,
    websiteId: realtimeContext.websiteId,
    visitorId: website?.visitor?.id ?? null,
  });

  return <>{children}</>;
}
