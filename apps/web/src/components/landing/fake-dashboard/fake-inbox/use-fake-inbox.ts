import type { ConversationHeader } from "@cossistant/types";
import { useState } from "react";
import { fakeConversations } from "../data";

export function useFakeInbox() {
  const [conversations, setConversations] =
    useState<ConversationHeader[]>(fakeConversations);

  const resetDemoData = () => {
    setConversations(fakeConversations);
  };

  return {
    conversations,
    resetDemoData,
  };
}
