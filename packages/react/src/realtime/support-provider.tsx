import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { Message } from "@cossistant/types/schemas";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useRealtimeSupport } from "../hooks/use-realtime-support";
import { useSupport } from "../provider";
import { upsertRealtimeMessageInCache } from "../support/hooks/use-messages";
import { QUERY_KEYS } from "../support/utils/query-keys";
import {
  createMessageCreatedHandler,
  type RealtimeEventHandler,
  type RealtimeEventHandlerContext,
  type RealtimeEventHandlerParams,
  type RealtimeEventHandlersMap,
  useRealtimeEvents,
} from "./index";

type SupportRealtimeContext = {
  websiteId: string | null;
};

type MessageCreatedParams = RealtimeEventHandlerParams<
  "MESSAGE_CREATED",
  SupportRealtimeContext
>;

function toSupportMessage(
  message: MessageCreatedParams["event"]["data"]["message"]
): Message {
  return {
    id: message.id,
    bodyMd: message.bodyMd,
    type: message.type as Message["type"],
    userId: message.userId,
    visitorId: message.visitorId,
    aiAgentId: message.aiAgentId,
    parentMessageId: message.parentMessageId,
    modelUsed: message.modelUsed,
    conversationId: message.conversationId,
    createdAt: new Date(message.createdAt),
    updatedAt: new Date(message.updatedAt),
    deletedAt: message.deletedAt ? new Date(message.deletedAt) : null,
    visibility: message.visibility as Message["visibility"],
  };
}

function createSupportMessageCreatedHandler(): RealtimeEventHandler<
  "MESSAGE_CREATED",
  SupportRealtimeContext
> {
  return createMessageCreatedHandler<SupportRealtimeContext, Message>({
    shouldHandleEvent: ({ event, context }) => {
      // console.log("shouldHandleEvent", {
      //   event: event.type,
      //   websiteId: event.data.websiteId,
      //   contextWebsiteId: context.websiteId,
      // });

      // // If we don't have a websiteId in context yet (still loading),
      // // accept all messages - they'll be filtered by conversation anyway
      // if (!context.websiteId) {
      //   return true;
      // }

      // // If we have a websiteId, only handle messages for our website
      // if (event.data.websiteId !== context.websiteId) {
      //   return false;
      // }

      return true;
    },
    mapEventToMessage: ({ event }) => toSupportMessage(event.data.message),
    onMessage: ({ context, event, message }) => {
      console.log("[SupportRealtimeProvider] onMessage", {
        conversationId: event.data.conversationId,
        messageId: message.id,
        hasQueryClient: !!context.queryClient,
        queryCacheSize:
          context.queryClient?.getQueryCache?.()?.getAll?.()?.length || 0,
        message,
      });
      upsertRealtimeMessageInCache(
        context.queryClient,
        event.data.conversationId,
        message
      );
    },
  });
}

export function SupportRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use useQueryClient from React Query instead of from useSupport
  const queryClient = useQueryClient();
  const { website } = useSupport();
  const { subscribe } = useRealtimeSupport();

  console.log("[SupportRealtimeProvider] Context values:", {
    hasQueryClient: !!queryClient,
    queryCacheSize: queryClient?.getQueryCache?.()?.getAll?.()?.length || 0,
    websiteId: website?.id,
  });

  const realtimeContext = useMemo<
    RealtimeEventHandlerContext<SupportRealtimeContext>
  >(
    () => ({
      queryClient,
      websiteId: website?.id ?? null,
    }),
    [queryClient, website?.id]
  );

  const handlers = useMemo<RealtimeEventHandlersMap<SupportRealtimeContext>>(
    () => ({
      MESSAGE_CREATED: [createSupportMessageCreatedHandler()],
    }),
    []
  );

  const subscribeToEvents = useCallback(
    (handler: (event: RealtimeEvent) => void) => subscribe(handler),
    [subscribe]
  );

  useRealtimeEvents<SupportRealtimeContext>({
    context: realtimeContext,
    handlers,
    subscribe: subscribeToEvents,
  });

  return <>{children}</>;
}
