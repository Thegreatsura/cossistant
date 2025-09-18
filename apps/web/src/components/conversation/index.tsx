"use client";

import { useMultimodalInput } from "@cossistant/react/hooks/use-multimodal-input";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import React from "react";
import { useDashboardRealtime } from "@/app/(dashboard)/[websiteSlug]/providers/websocket";
import { useWebsiteMembers } from "@/contexts/website";

import { useConversationEvents } from "@/data/use-conversation-events";
import { useConversationMessages } from "@/data/use-conversation-messages";
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

const isMessageCreatedEvent = (
  event: RealtimeEvent
): event is RealtimeEvent<"MESSAGE_CREATED"> => {
  return event.type === "MESSAGE_CREATED";
};

export function Conversation({
  conversationId,
  visitorId,
  currentUserId,
  websiteSlug,
}: ConversationProps) {
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
  } = useMultimodalInput();

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
    const promises: Promise<unknown>[] = [];

    if (hasNextPageMessages) {
      promises.push(fetchNextPageMessages());
    }

    if (hasNextPageEvents) {
      promises.push(fetchNextPageEvents());
    }

    await Promise.all(promises);
  };

  if (!visitor) {
    return null;
  }

  return (
    <>
      <Page className="relative px-[1px] py-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-gradient-to-b from-co-background/50 to-transparent dark:from-co-background-100/80" />
        <ConversationHeader />
        <MessagesList
          availableAIAgents={[]}
          currentUserId={currentUserId}
          events={events}
          messages={messages}
          onFetchMoreIfNeeded={onFetchMoreIfNeeded}
          teamMembers={members}
          visitor={visitor}
        />
        <MultimodalInput
          allowedFileTypes={["image/*", "application/pdf", "text/*"]}
          error={error}
          files={files}
          isSubmitting={isSubmitting}
          maxFileSize={10 * 1024 * 1024}
          maxFiles={2}
          onChange={setMessage}
          onFileSelect={addFiles}
          onRemoveFile={removeFile}
          onSubmit={submit}
          placeholder="Type your message..."
          value={message}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-30 bg-gradient-to-t from-co-background to-transparent dark:from-co-background-100/90" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-co-background/50 via-co-background to-transparent dark:from-co-background-100/90 dark:via-co-background-100" />
      </Page>
      <VisitorSidebar isLoading={isLoading} visitor={visitor} />
    </>
  );
}
