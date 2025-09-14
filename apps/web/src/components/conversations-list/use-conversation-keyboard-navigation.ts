"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useConversationFocusStore } from "@/contexts/inboxes/conversation-focus-store";

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
	const lastInteractionRef = useRef<"keyboard" | "mouse">("keyboard");
	const hasInitializedRef = useRef(false);

	const {
		focusedConversationId,
		shouldRestoreFocus,
		setFocusedConversationId,
		markFocusRestored,
	} = useConversationFocusStore();

	// Initialize focus index - restore from store if we should
	const [focusedIndex, setFocusedIndex] = useState(() => {
		if (
			shouldRestoreFocus &&
			focusedConversationId &&
			conversations.length > 0
		) {
			const index = conversations.findIndex(
				(c) => c.id === focusedConversationId,
			);
			if (index !== -1) {
				return index;
			}
		}
		return 0;
	});

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
		[itemHeight, parentRef],
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
		[conversations.length, scrollToItem],
	);

	const navigateToConversation = useCallback(() => {
		if (focusedIndex >= 0 && focusedIndex < conversations.length) {
			const conversation = conversations[focusedIndex];
			if (conversation) {
				// Store the focused conversation ID before navigating
				setFocusedConversationId(conversation.id);
				router.push(`${basePath}/${conversation.id}`);
			}
		}
	}, [focusedIndex, conversations, basePath, router, setFocusedConversationId]);

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
		[moveFocus, navigateToConversation, enabled],
	);

	// Restore focus from store on mount if needed
	useEffect(() => {
		if (!enabled || conversations.length === 0 || hasInitializedRef.current)
			return;

		if (shouldRestoreFocus && focusedConversationId) {
			const index = conversations.findIndex(
				(c) => c.id === focusedConversationId,
			);
			if (index !== -1) {
				setFocusedIndex(index);
				scrollToItem(index);
				lastInteractionRef.current = "keyboard";
				markFocusRestored();
			} else {
				scrollToItem(0);
			}
		} else {
			scrollToItem(focusedIndex);
		}

		hasInitializedRef.current = true;
	}, [
		enabled,
		conversations,
		focusedConversationId,
		shouldRestoreFocus,
		scrollToItem,
		markFocusRestored,
	]);

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
