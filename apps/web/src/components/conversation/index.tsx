"use client";

import { useMultimodalInput } from "@cossistant/react/hooks/use-multimodal-input";
import { useRef } from "react";
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
};

export function Conversation({
  conversationId,
  visitorId,
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

  return (
    <>
      <Page className="py-0 px-[1px]">
        <ConversationHeader />
        <MessagesList
          onFetchMoreIfNeeded={onFetchMoreIfNeeded}
          messages={messages}
          events={events}
          availableAIAgents={[]}
          availableHumanAgents={[]}
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
      </Page>
      <VisitorSidebar visitor={visitor} isLoading={isLoading} />
    </>
  );
}
