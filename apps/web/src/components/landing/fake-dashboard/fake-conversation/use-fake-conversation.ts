import { useState } from "react";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import {
  createMarcConversation,
  type FakeTypingVisitor,
  marcVisitor,
} from "../data";

export function useFakeConversation() {
  const conversation = createMarcConversation(
    "Hey! The widget isn't loading on my production site. It works fine locally though.",
    new Date()
  );
  const [timelineItems, setTimelineItems] = useState<
    ConversationTimelineItem[]
  >([]);
  const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);

  const resetDemoData = () => {
    setTypingVisitors([]);
  };

  return {
    conversation,
    timelineItems,
    visitor: marcVisitor,
    resetDemoData,
    typingVisitors,
  };
}
