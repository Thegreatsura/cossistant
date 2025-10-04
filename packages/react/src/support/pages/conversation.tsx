import { useConversationMessages } from "@cossistant/react/hooks/use-conversation-messages";
import type {
  ConversationEvent,
  Message as MessageType,
} from "@cossistant/types";
import React from "react";
import { useDefaultMessages } from "../../hooks/private/use-default-messages";
import { useVisitorTypingReporter } from "../../hooks/private/use-visitor-typing-reporter";
import { useCreateConversation } from "../../hooks/use-create-conversation";
import { useSendMessage } from "../../hooks/use-send-message";
import { useSupport } from "../../provider";
import {
  hydrateConversationSeen,
  upsertConversationSeen,
} from "../../realtime/seen-store";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { AvatarStack } from "../components/avatar-stack";
import { Header } from "../components/header";
import { MessageList } from "../components/message-list";
import { MultimodalInput } from "../components/multimodal-input";
import { useSupportNavigation } from "../store";

type ConversationPageProps = {
  conversationId: string;
  message: string;
  files: File[];
  isSubmitting: boolean;
  error: Error | null;
  setMessage: (message: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  messages?: MessageType[];
  events: ConversationEvent[];
};

export const ConversationPage = ({
  conversationId,
  message,
  files,
  isSubmitting,
  error,
  setMessage,
  addFiles,
  removeFile,
  messages = [],
  events = [],
}: ConversationPageProps) => {
  const { website, availableAIAgents, availableHumanAgents, client, visitor } =
    useSupport();
  const { navigate, replace, goBack, canGoBack } = useSupportNavigation();
  const lastSeenMessageIdRef = React.useRef<string | null>(null);
  const markSeenInFlightRef = React.useRef(false);
  const [isPageVisible, setIsPageVisible] = React.useState(
    typeof document !== "undefined" ? !document.hidden : true
  );

  // Determine if we have a real conversation or pending one
  const hasRealConversation = conversationId !== PENDING_CONVERSATION_ID;
  const realConversationId = hasRealConversation ? conversationId : null;
  const defaultMessages = useDefaultMessages({
    conversationId,
  });
  const { mutateAsync: initiateConversation } = useCreateConversation({
    client,
  });
  const bootstrapAttemptedRef = React.useRef(false);

  const messagesQuery = useConversationMessages(conversationId);

  // Messages are already flattened in the hook
  const fetchedMessages = messagesQuery.messages;

  const sendMessage = useSendMessage({ client });
  const {
    handleInputChange: handleTypingChange,
    handleSubmit: handleTypingSubmit,
    stop: stopTyping,
  } = useVisitorTypingReporter({
    client: client ?? null,
    conversationId: realConversationId,
  });

  React.useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  // Track page visibility
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  React.useEffect(() => {
    if (hasRealConversation || bootstrapAttemptedRef.current) {
      return;
    }

    bootstrapAttemptedRef.current = true;
    let cancelled = false;

    void initiateConversation({
      defaultMessages,
      visitorId: visitor?.id,
      websiteId: website?.id ?? null,
    })
      .then((response) => {
        if (!response || cancelled) {
          return;
        }

        replace({
          page: "CONVERSATION",
          params: { conversationId: response.conversation.id },
        });
      })
      .catch(() => {
        bootstrapAttemptedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasRealConversation,
    initiateConversation,
    defaultMessages,
    replace,
    visitor?.id,
    website?.id,
  ]);

  const handleSubmit = React.useCallback(() => {
    if (!message.trim() && files.length === 0) {
      return;
    }

    handleTypingSubmit();

    sendMessage.mutate({
      conversationId: realConversationId,
      message: message.trim(),
      files,
      defaultMessages,
      visitorId: visitor?.id,
      onSuccess: (newConversationId, messageId) => {
        if (
          !hasRealConversation &&
          newConversationId !== PENDING_CONVERSATION_ID
        ) {
          replace({
            page: "CONVERSATION",
            params: { conversationId: newConversationId },
          });
        }

        setMessage("");
        handleTypingChange("");

        // Mark the message we just sent as seen immediately
        // The backend will handle updating the seen timestamp
        if (messageId) {
          lastSeenMessageIdRef.current = messageId;
        }
      },
      onError: (_error) => {
        console.error("Failed to send message:", _error);
      },
    });
  }, [
    message,
    files,
    realConversationId,
    hasRealConversation,
    defaultMessages,
    visitor?.id,
    sendMessage,
    replace,
    setMessage,
    handleTypingSubmit,
    handleTypingChange,
  ]);

  const handleMessageChange = React.useCallback(
    (value: string) => {
      setMessage(value);
      handleTypingChange(value);
    },
    [setMessage, handleTypingChange]
  );

  const actualMessages =
    fetchedMessages.length > 0
      ? fetchedMessages
      : hasRealConversation
        ? messages
        : defaultMessages;
  const actualIsSubmitting = isSubmitting || sendMessage.isPending;
  const actualError = error || messagesQuery.error;
  const lastMessage = React.useMemo(
    () => actualMessages.at(-1) ?? null,
    [actualMessages]
  );

  // Reset seen tracking when conversation changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: We intentionally reset refs when conversationId changes
  React.useEffect(() => {
    lastSeenMessageIdRef.current = null;
    markSeenInFlightRef.current = false;
  }, [conversationId]);

  // Fetch and hydrate initial seen data when conversation loads
  React.useEffect(() => {
    if (!hasRealConversation) {
      return;
    }

    if (!client) {
      return;
    }

    void client
      .getConversationSeenData({ conversationId: realConversationId })
      .then((response) => {
        if (response.seenData.length > 0) {
          hydrateConversationSeen(realConversationId, response.seenData);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch conversation seen data:", err);
      });
  }, [hasRealConversation, realConversationId, client]);

  React.useEffect(() => {
    // Only mark as seen if:
    // 1. We have a real conversation with a client and visitor
    // 2. There's a last message
    // 3. The last message is NOT from the current visitor
    // 4. The page is currently visible (focused)
    if (
      !(client && realConversationId && visitor?.id && lastMessage) ||
      lastMessage.visitorId === visitor.id ||
      !isPageVisible
    ) {
      if (lastMessage && lastMessage.visitorId === visitor?.id) {
        lastSeenMessageIdRef.current = lastMessage.id;
      }
      return;
    }

    if (lastSeenMessageIdRef.current === lastMessage.id) {
      return;
    }

    if (markSeenInFlightRef.current) {
      return;
    }

    markSeenInFlightRef.current = true;

    client
      .markConversationSeen({ conversationId: realConversationId })
      .then((response) => {
        lastSeenMessageIdRef.current = lastMessage.id;

        // Optimistically update the local seen store so UI reflects the change immediately
        if (visitor?.id) {
          upsertConversationSeen({
            conversationId: realConversationId,
            actorType: "visitor",
            actorId: visitor.id,
            lastSeenAt: response.lastSeenAt,
          });
        }
      })
      .catch((markSeenError) => {
        console.error("Failed to mark conversation as seen:", markSeenError);
      })
      .finally(() => {
        markSeenInFlightRef.current = false;
      });
  }, [client, realConversationId, visitor?.id, lastMessage, isPageVisible]);

  const handleGoBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate({
        page: "HOME",
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden">
      <Header onGoBack={handleGoBack}>
        <div className="flex w-full items-center justify-between gap-2 py-3">
          <div className="flex flex-col">
            <p className="font-medium text-sm">{website?.name}</p>
            <p className="text-muted-foreground text-sm">Support online</p>
          </div>
          <AvatarStack
            aiAgents={availableAIAgents}
            gapWidth={2}
            humanAgents={availableHumanAgents}
            size={32}
            spacing={28}
          />
        </div>
      </Header>

      <MessageList
        availableAIAgents={availableAIAgents}
        availableHumanAgents={availableHumanAgents}
        className="min-h-0 flex-1 px-4"
        conversationId={conversationId}
        currentVisitorId={visitor?.id}
        events={events}
        messages={actualMessages}
      />

      <div className="flex-shrink-0 p-1">
        <MultimodalInput
          disabled={actualIsSubmitting}
          error={actualError}
          files={files}
          isSubmitting={actualIsSubmitting}
          onChange={handleMessageChange}
          onFileSelect={addFiles}
          onRemoveFile={removeFile}
          onSubmit={handleSubmit}
          placeholder="Type your message..."
          value={message}
        />
      </div>
    </div>
  );
};
