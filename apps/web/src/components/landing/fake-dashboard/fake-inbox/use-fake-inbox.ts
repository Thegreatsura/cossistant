import type { ConversationHeader } from "@cossistant/types";
import { useEffect, useState } from "react";
import {
  createMarcConversation,
  type FakeTypingVisitor,
  fakeConversations,
} from "../data";

export function useFakeInbox() {
  const [conversations, setConversations] =
    useState<ConversationHeader[]>(fakeConversations);
  const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);

  const resetDemoData = () => {
    setConversations(fakeConversations);
    setTypingVisitors([]);
  };

  // Simulate Marc Louvion's conversation with multiple messages
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const marcConversationId = "01JGAA2222222222222222222";
    const marcVisitorId = "01JGVIS22222222222222222";

    // Add Marc's first message after 2 seconds
    timeouts.push(
      setTimeout(() => {
        const firstMessage = createMarcConversation(
          "Hey! The widget isn't loading on my production site. It works fine locally though.",
          new Date()
        );
        setConversations((prev) => [firstMessage, ...prev]);
      }, 2000)
    );

    // Marc starts typing the second message after 5 seconds
    timeouts.push(
      setTimeout(() => {
        setTypingVisitors([
          {
            conversationId: marcConversationId,
            visitorId: marcVisitorId,
            preview: null,
          },
        ]);
      }, 5000)
    );

    // Marc sends second message after 8 seconds
    timeouts.push(
      setTimeout(() => {
        setTypingVisitors([]);
        const secondMessage = createMarcConversation(
          "I checked the console and I'm getting a CORS error. Is there something I need to configure?",
          new Date()
        );
        setConversations((prev) => {
          // Remove the old Marc conversation and add the updated one
          const filtered = prev.filter((c) => c.id !== marcConversationId);
          return [secondMessage, ...filtered];
        });
      }, 8000)
    );

    // Marc starts typing the third message after 11 seconds
    timeouts.push(
      setTimeout(() => {
        setTypingVisitors([
          {
            conversationId: marcConversationId,
            visitorId: marcVisitorId,
            preview: null,
          },
        ]);
      }, 11_000)
    );

    // Marc sends third message after 14 seconds
    timeouts.push(
      setTimeout(() => {
        setTypingVisitors([]);
        const thirdMessage = createMarcConversation(
          "Also tried checking the API key but it looks correct. Any ideas?",
          new Date()
        );
        setConversations((prev) => {
          // Remove the old Marc conversation and add the updated one
          const filtered = prev.filter((c) => c.id !== marcConversationId);
          return [thirdMessage, ...filtered];
        });
      }, 14_000)
    );

    // Cleanup timeouts on unmount
    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return {
    conversations,
    typingVisitors,
    resetDemoData,
  };
}
