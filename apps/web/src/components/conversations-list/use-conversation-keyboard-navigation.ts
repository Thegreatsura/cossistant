"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useConversationFocusStore } from "@/contexts/inboxes/conversation-focus-store";
import type { VirtualListItem } from "./types";

type UseConversationKeyboardNavigationProps = {
	conversations: Array<{ id: string }>;
	items?: VirtualListItem[] | null;
	basePath: string;
	parentRef: React.RefObject<HTMLDivElement | null>;
	itemHeight: number;
	headerHeight?: number;
	enabled?: boolean;
};

export function useConversationKeyboardNavigation({
	conversations,
	items,
	basePath,
	parentRef,
	itemHeight,
	headerHeight = 32,
	enabled = true,
}: UseConversationKeyboardNavigationProps) {
	const router = useRouter();
	const lastInteractionRef = useRef<"keyboard" | "mouse">("keyboard");
	const hasInitializedRef = useRef(false);

	const isSmartMode = items != null && items.length > 0;
	const totalCount = isSmartMode ? items.length : conversations.length;

	const {
		focusedConversationId,
		shouldRestoreFocus,
		setFocusedConversationId,
		markFocusRestored,
	} = useConversationFocusStore();

	// Helper to check if an index is a header
	const isHeaderIndex = useCallback(
		(index: number): boolean => {
			if (!isSmartMode) {
				return false;
			}

			return items[index]?.type === "header";
		},
		[isSmartMode, items]
	);

	// Helper to get conversation ID at an index
	const getConversationIdAtIndex = useCallback(
		(index: number): string | null => {
			if (isSmartMode) {
				const item = items[index];

				if (item?.type === "conversation") {
					return item.conversation.id;
				}

				return null;
			}

			return conversations[index]?.id ?? null;
		},
		[isSmartMode, items, conversations]
	);

	// Find first non-header index
	const findFirstConversationIndex = useCallback((): number => {
		if (!isSmartMode) {
			return 0;
		}

		for (let i = 0; i < items.length; i++) {
			if (items[i]?.type === "conversation") {
				return i;
			}
		}

		return 0;
	}, [isSmartMode, items]);

	// Find next conversation index (skipping headers)
	const findNextConversationIndex = useCallback(
		(currentIndex: number, direction: "up" | "down"): number => {
			const delta = direction === "up" ? -1 : 1;
			let newIndex = currentIndex + delta;

			while (newIndex >= 0 && newIndex < totalCount) {
				if (!isHeaderIndex(newIndex)) {
					return newIndex;
				}

				newIndex += delta;
			}

			// If we couldn't find a valid index, stay at current
			return currentIndex;
		},
		[totalCount, isHeaderIndex]
	);

	// Initialize focus index - restore from store if we should
	const [focusedIndex, setFocusedIndex] = useState(() => {
		if (shouldRestoreFocus && focusedConversationId && totalCount > 0) {
			if (isSmartMode) {
				const index = items.findIndex(
					(item) =>
						item.type === "conversation" &&
						item.conversation.id === focusedConversationId
				);

				if (index !== -1) {
					return index;
				}
			} else {
				const index = conversations.findIndex(
					(c) => c.id === focusedConversationId
				);

				if (index !== -1) {
					return index;
				}
			}
		}

		return findFirstConversationIndex();
	});

	const getItemOffset = useCallback(
		(index: number): number => {
			if (!isSmartMode) {
				return index * itemHeight;
			}

			// Calculate offset considering variable heights
			let offset = 0;

			for (let i = 0; i < index; i++) {
				const item = items[i];
				offset += (item?.type === "header" ? headerHeight : itemHeight) + 4; // 4px gap
			}

			return offset;
		},
		[isSmartMode, items, itemHeight, headerHeight]
	);

	const scrollToItem = useCallback(
		(index: number) => {
			if (!parentRef.current) {
				return;
			}

			const container = parentRef.current;
			const itemTop = getItemOffset(index);
			const currentItemHeight = isHeaderIndex(index)
				? headerHeight
				: itemHeight;
			const itemBottom = itemTop + currentItemHeight;
			const scrollTop = container.scrollTop;
			const scrollBottom = scrollTop + container.clientHeight;

			if (itemTop < scrollTop) {
				container.scrollTop = itemTop;
			} else if (itemBottom > scrollBottom) {
				container.scrollTop = itemBottom - container.clientHeight;
			}
		},
		[getItemOffset, isHeaderIndex, itemHeight, headerHeight, parentRef]
	);

	const moveFocus = useCallback(
		(direction: "up" | "down") => {
			lastInteractionRef.current = "keyboard";
			setFocusedIndex((prevIndex) => {
				const newIndex = findNextConversationIndex(prevIndex, direction);

				if (newIndex !== prevIndex) {
					scrollToItem(newIndex);
				}

				return newIndex;
			});
		},
		[findNextConversationIndex, scrollToItem]
	);

	const navigateToConversation = useCallback(() => {
		const conversationId = getConversationIdAtIndex(focusedIndex);

		if (conversationId) {
			// Store the focused conversation ID before navigating
			setFocusedConversationId(conversationId);
			router.push(`${basePath}/${conversationId}`);
		}
	}, [
		focusedIndex,
		getConversationIdAtIndex,
		basePath,
		router,
		setFocusedConversationId,
	]);

	const handleMouseEnter = useCallback(
		(index: number) => {
			// Don't allow focusing on headers
			if (isHeaderIndex(index)) {
				return;
			}

			lastInteractionRef.current = "mouse";
			setFocusedIndex(index);
		},
		[isHeaderIndex]
	);

	useHotkeys(
		["ArrowUp", "ArrowDown", "k", "j", "Enter"],
		(event, handler) => {
			if (!enabled) {
				return;
			}

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
				default:
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

	// Restore focus from store on mount if needed
	useEffect(() => {
		if (!enabled || totalCount === 0 || hasInitializedRef.current) {
			return;
		}

		if (shouldRestoreFocus && focusedConversationId) {
			let index = -1;

			if (isSmartMode) {
				index = items.findIndex(
					(item) =>
						item.type === "conversation" &&
						item.conversation.id === focusedConversationId
				);
			} else {
				index = conversations.findIndex((c) => c.id === focusedConversationId);
			}

			if (index !== -1) {
				setFocusedIndex(index);
				scrollToItem(index);
				lastInteractionRef.current = "keyboard";
				markFocusRestored();
			} else {
				const firstIndex = findFirstConversationIndex();
				setFocusedIndex(firstIndex);
				scrollToItem(firstIndex);
			}
		} else {
			const firstIndex = findFirstConversationIndex();
			scrollToItem(firstIndex);
		}

		hasInitializedRef.current = true;
	}, [
		enabled,
		totalCount,
		isSmartMode,
		items,
		conversations,
		focusedConversationId,
		shouldRestoreFocus,
		scrollToItem,
		markFocusRestored,
		findFirstConversationIndex,
	]);

	// Ensure focused index stays valid when list changes
	useEffect(() => {
		if (focusedIndex >= totalCount && totalCount > 0) {
			// Find the last valid conversation index
			let lastValidIndex = totalCount - 1;

			while (lastValidIndex >= 0 && isHeaderIndex(lastValidIndex)) {
				lastValidIndex--;
			}

			setFocusedIndex(Math.max(0, lastValidIndex));
		}
	}, [totalCount, focusedIndex, isHeaderIndex]);

	return {
		focusedIndex,
		handleMouseEnter,
		isKeyboardNavigation: lastInteractionRef.current === "keyboard",
	};
}
