"use client";

import { useMultimodalInput } from "@cossistant/react/hooks/use-multimodal-input";
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
