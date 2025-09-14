"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface UseConversationKeyboardNavigationProps {
  conversations: Array<{ id: string }>;
  basePath: string;
  parentRef: React.RefObject<HTMLDivElement | null>;
  itemHeight: number;
  enabled?: boolean;
}

export function useConversationKeyboardNavigation({
  conversations,
  basePath,
  parentRef,
  itemHeight,
  enabled = true,
}: UseConversationKeyboardNavigationProps) {
  const router = useRouter();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const lastInteractionRef = useRef<"keyboard" | "mouse">("keyboard");

  const scrollToItem = useCallback(
    (index: number) => {
      if (!parentRef.current) return;

      const container = parentRef.current;
      const itemTop = index * itemHeight;
      const itemBottom = itemTop + itemHeight;
      const scrollTop = container.scrollTop;
      const scrollBottom = scrollTop + container.clientHeight;

      if (itemTop < scrollTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > scrollBottom) {
        container.scrollTop = itemBottom - container.clientHeight;
      }
    },
    [itemHeight, parentRef]
  );

  const moveFocus = useCallback(
    (direction: "up" | "down") => {
      lastInteractionRef.current = "keyboard";
      setFocusedIndex((prevIndex) => {
        let newIndex = prevIndex;

        if (direction === "up") {
          newIndex = Math.max(0, prevIndex - 1);
        } else {
          newIndex = Math.min(conversations.length - 1, prevIndex + 1);
        }

        if (newIndex !== prevIndex) {
          scrollToItem(newIndex);
        }

        return newIndex;
      });
    },
    [conversations.length, scrollToItem]
  );

  const navigateToConversation = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < conversations.length) {
      const conversation = conversations[focusedIndex];
      if (conversation) {
        router.push(`${basePath}/${conversation.id}`);
      }
    }
  }, [focusedIndex, conversations, basePath, router]);

  const handleMouseEnter = useCallback((index: number) => {
    lastInteractionRef.current = "mouse";
    setFocusedIndex(index);
  }, []);

  useHotkeys(
    ["ArrowUp", "ArrowDown", "k", "j", "Enter"],
    (event, handler) => {
      if (!enabled) return;

      event.preventDefault();
      event.stopPropagation();

      switch (handler.keys?.join("")) {
        case "arrowup":
        case "k":
          moveFocus("up");
          break;
        case "arrowdown":
        case "j":
          moveFocus("down");
          break;
        case "enter":
          navigateToConversation();
          break;
      }
    },
    {
      enabled,
      enableOnFormTags: false,
      enableOnContentEditable: false,
    },
    [moveFocus, navigateToConversation, enabled]
  );

  useEffect(() => {
    if (enabled && conversations.length > 0 && focusedIndex === 0) {
      lastInteractionRef.current = "keyboard";
      scrollToItem(0);
    }
  }, [enabled, conversations.length, focusedIndex, scrollToItem]);

  useEffect(() => {
    if (focusedIndex >= conversations.length && conversations.length > 0) {
      setFocusedIndex(conversations.length - 1);
    }
  }, [conversations.length, focusedIndex]);

  return {
    focusedIndex,
    handleMouseEnter,
    isKeyboardNavigation: lastInteractionRef.current === "keyboard",
  };
}
