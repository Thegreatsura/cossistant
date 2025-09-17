"use client";

import { useMultimodalInput } from "@cossistant/react/hooks/use-multimodal-input";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { MessageType, MessageVisibility } from "@cossistant/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useCallback } from "react";
import { useDashboardRealtime } from "@/app/(dashboard)/[websiteSlug]/providers/websocket";
import { useWebsiteMembers } from "@/contexts/website";
import {
  createConversationMessagesInfiniteQueryKey,
  removeConversationMessageFromCache,
  type ConversationMessage,
  type ConversationMessagesPage,
  upsertConversationMessageInCache,
} from "@/data/conversation-message-cache";
import { useConversationEvents } from "@/data/use-conversation-events";
import { useConversationMessages } from "@/data/use-conversation-messages";
import { useTRPC } from "@/lib/trpc/client";
import { useVisitor } from "@/data/use-visitor";
import { Page } from "../ui/layout";
import { VisitorSidebar } from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader } from "./header";
import { MessagesList } from "./messages/list";
import { MultimodalInput } from "./multimodal-input";

type ConversationProps = {
  conversationId: string;
  visitorId: string;
  websiteSlug: string;
  currentUserId: string;
};

export function Conversation({
  conversationId,
  visitorId,
  currentUserId,
  websiteSlug,
}: ConversationProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const baseMessagesQueryOptions =
    trpc.conversation.getConversationMessages.queryOptions({
      websiteSlug,
      conversationId,
    });

  const messagesInfiniteQueryKey =
    createConversationMessagesInfiniteQueryKey(
      baseMessagesQueryOptions.queryKey,
    );

  type MutationContext = {
    previousData?: InfiniteData<ConversationMessagesPage>;
    optimisticMessageId: string;
  };

  const { mutateAsync: sendMessage } = useMutation(
    trpc.conversation.sendMessage.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: messagesInfiniteQueryKey,
        });

        const previousData = queryClient.getQueryData<
          InfiniteData<ConversationMessagesPage>
        >(messagesInfiniteQueryKey);

        const optimisticMessageId = `optimistic-${Date.now()}`;

        const optimisticMessage: ConversationMessage = {
          id: optimisticMessageId,
          bodyMd: variables.bodyMd,
          type: variables.type ?? MessageType.TEXT,
          userId: currentUserId,
          aiAgentId: null,
          visitorId: null,
          conversationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          visibility: variables.visibility ?? MessageVisibility.PUBLIC,
        };

        upsertConversationMessageInCache(
          queryClient,
          messagesInfiniteQueryKey,
          optimisticMessage,
        );

        return { previousData, optimisticMessageId } satisfies MutationContext;
      },
      onError: (_error, _variables, context) => {
        if (!context) {
          return;
        }

        if (context.previousData) {
          queryClient.setQueryData(
            messagesInfiniteQueryKey,
            context.previousData,
          );
          return;
        }

        removeConversationMessageFromCache(
          queryClient,
          messagesInfiniteQueryKey,
          context.optimisticMessageId,
        );
      },
      onSuccess: (data, _variables, context) => {
        if (context) {
          removeConversationMessageFromCache(
            queryClient,
            messagesInfiniteQueryKey,
            context.optimisticMessageId,
          );
        }

        upsertConversationMessageInCache(
          queryClient,
          messagesInfiniteQueryKey,
          data.message,
        );
      },
    }),
  );

  const {
    message,
    files,
    isSubmitting,
    error,
    setMessage,
    addFiles,
    removeFile,
    clearFiles,
    submit,
    reset,
    isValid,
    canSubmit,
  } = useMultimodalInput({
    onSubmit: async ({ message: messageContent }) => {
      await sendMessage({
        conversationId,
        websiteSlug,
        bodyMd: messageContent,
        type: MessageType.TEXT,
        visibility: MessageVisibility.PUBLIC,
      });
    },
  });

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (
        event.type === "MESSAGE_CREATED" &&
        event.data.conversationId === conversationId
      ) {
        console.log("[Conversation] MESSAGE_CREATED event received", event.data);
      }
    },
    [conversationId],
  );

  useDashboardRealtime({ onEvent: handleRealtimeEvent });

  const members = useWebsiteMembers();

  const {
    messages,
    fetchNextPage: fetchNextPageMessages,
    hasNextPage: hasNextPageMessages,
  } = useConversationMessages({ conversationId, websiteSlug });

  const {
    events,
    fetchNextPage: fetchNextPageEvents,
    hasNextPage: hasNextPageEvents,
  } = useConversationEvents({ conversationId, websiteSlug });

  const { visitor, isLoading } = useVisitor({ visitorId, websiteSlug });

  const onFetchMoreIfNeeded = async () => {
    const promises = [];

    if (hasNextPageMessages) {
      promises.push(fetchNextPageMessages());
    }

    if (hasNextPageEvents) {
      promises.push(fetchNextPageEvents());
    }

    await Promise.all(promises);
  };

  if (!visitor) {
    return <></>;
  }

  return (
    <>
      <Page className="py-0 px-[1px] relative">
        <div className="absolute inset-x-0 top-0 h-14 z-0 bg-gradient-to-b from-co-background/50 dark:from-co-background-100/80 to-transparent pointer-events-none" />
        <ConversationHeader />
        <MessagesList
          onFetchMoreIfNeeded={onFetchMoreIfNeeded}
          messages={messages}
          events={events}
          availableAIAgents={[]}
          teamMembers={members}
          visitor={visitor}
          currentUserId={currentUserId}
        />
        <MultimodalInput
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          files={files}
          isSubmitting={isSubmitting}
          error={error}
          onFileSelect={addFiles}
          onRemoveFile={removeFile}
          placeholder="Type your message..."
          allowedFileTypes={["image/*", "application/pdf", "text/*"]}
          maxFiles={2}
          maxFileSize={10 * 1024 * 1024}
        />
        <div className="absolute inset-x-0 bottom-0 h-30 z-0 bg-gradient-to-t from-co-background dark:from-co-background-100/90 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-co-background/50 dark:from-co-background-100/90 via-co-background dark:via-co-background-100 to-transparent pointer-events-none" />
      </Page>
      <VisitorSidebar visitor={visitor} isLoading={isLoading} />
    </>
  );
}
