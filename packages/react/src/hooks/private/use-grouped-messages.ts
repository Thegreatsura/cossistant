import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { useMemo } from "react";

export type GroupedMessage = {
	type: "message_group";
	senderId: string;
	senderType: SenderType;
	items: TimelineItem[];
	firstMessageId: string;
	lastMessageId: string;
	firstMessageTime: Date;
	lastMessageTime: Date;
};

export type TimelineEventItem = {
	type: "timeline_event";
	item: TimelineItem;
	timestamp: Date;
};

export type TimelineToolItem = {
	type: "timeline_tool";
	item: TimelineItem;
	tool: string | null;
	timestamp: Date;
};

export type DaySeparatorItem = {
	type: "day_separator";
	date: Date;
	dateString: string; // ISO date string (YYYY-MM-DD) for stable keys
};

export type ConversationItem =
	| GroupedMessage
	| TimelineEventItem
	| TimelineToolItem
	| DaySeparatorItem;

export type UseGroupedMessagesOptions = {
	items: TimelineItem[];
	seenData?: ConversationSeen[];
	currentViewerId?: string; // The ID of the current viewer (visitor, user, or AI agent)
};

export type UseGroupedMessagesProps = UseGroupedMessagesOptions;

// Helper function to safely get timestamp from Date or string
const getTimestamp = (date: Date | string | null | undefined): number => {
	if (!date) {
		return 0;
	}
	if (typeof date === "string") {
		return new Date(date).getTime();
	}
	return date.getTime();
};

// Helper function to safely convert to Date
const toDate = (date: Date | string | null | undefined): Date => {
	if (!date) {
		return typeof window !== "undefined" ? new Date() : new Date(0);
	}
	if (typeof date === "string") {
		return new Date(date);
	}
	return date;
};

// Helper to extract the date string (YYYY-MM-DD) from a Date for day comparison
const getDateString = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

// Helper to create a Date at midnight for a given date string
const createDayDate = (dateString: string): Date => {
	const [year, month, day] = dateString.split("-").map(Number);
	return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
};

// Helper to determine sender ID and type from a timeline item
const getSenderIdAndTypeFromTimelineItem = (
	item: TimelineItem
): { senderId: string; senderType: SenderType } => {
	if (item.visitorId) {
		return { senderId: item.visitorId, senderType: SenderType.VISITOR };
	}
	if (item.aiAgentId) {
		return { senderId: item.aiAgentId, senderType: SenderType.AI };
	}
	if (item.userId) {
		return { senderId: item.userId, senderType: SenderType.TEAM_MEMBER };
	}

	// Fallback
	return {
		senderId: item.id || "default-sender",
		senderType: SenderType.TEAM_MEMBER,
	};
};

const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);

// Helper function to group timeline items (messages only, events stay separate)
// Also inserts day separators when the day changes between items
const groupTimelineItems = (items: TimelineItem[]): ConversationItem[] => {
	const result: ConversationItem[] = [];
	let currentGroup: GroupedMessage | null = null;
	let currentDayString: string | null = null;

	const maybeInsertDaySeparator = (itemDate: Date): void => {
		const itemDayString = getDateString(itemDate);

		if (currentDayString !== itemDayString) {
			// Finalize any existing group before inserting day separator
			if (currentGroup) {
				result.push(currentGroup);
				currentGroup = null;
			}

			// Insert day separator
			result.push({
				type: "day_separator",
				date: createDayDate(itemDayString),
				dateString: itemDayString,
			});

			currentDayString = itemDayString;
		}
	};

	for (const item of items) {
		const itemDate = toDate(item.createdAt);

		// Check for day boundary before processing any item
		maybeInsertDaySeparator(itemDate);

		// Events don't get grouped
		if (item.type === "event") {
			// Finalize any existing group
			if (currentGroup) {
				result.push(currentGroup);
				currentGroup = null;
			}

			// Add event as standalone item
			result.push({
				type: "timeline_event",
				item,
				timestamp: itemDate,
			});
			continue;
		}

		if (item.type === "identification") {
			// Finalize any existing group
			if (currentGroup) {
				result.push(currentGroup);
				currentGroup = null;
			}

			// Add tool item as standalone entry
			result.push({
				type: "timeline_tool",
				item,
				tool: item.tool ?? null,
				timestamp: itemDate,
			});
			continue;
		}

		// Group messages by sender
		const { senderId, senderType } = getSenderIdAndTypeFromTimelineItem(item);

		if (currentGroup && currentGroup.senderId === senderId) {
			// Add to existing group (day boundary already handled above)
			currentGroup.items.push(item);
			currentGroup.lastMessageId = item.id || currentGroup.lastMessageId;
			currentGroup.lastMessageTime = itemDate;
		} else {
			// Finalize previous group if exists
			if (currentGroup) {
				result.push(currentGroup);
			}

			// Start new group
			currentGroup = {
				type: "message_group",
				senderId,
				senderType,
				items: [item],
				firstMessageId: item.id || "",
				lastMessageId: item.id || "",
				firstMessageTime: itemDate,
				lastMessageTime: itemDate,
			};
		}
	}

	if (currentGroup) {
		result.push(currentGroup);
	}

	return result;
};

// Build read receipt data for timeline items
// Accepts pre-sorted message items for performance
const buildTimelineReadReceiptData = (
	seenData: ConversationSeen[],
	items: TimelineItem[],
	sortedMessageItems: TimelineItem[],
	sortedMessageTimes: number[]
) => {
	const seenByMap = new Map<string, Set<string>>();
	const lastReadMessageMap = new Map<string, string>();
	const unreadCountMap = new Map<string, number>();

	// Initialize map for all message-type timeline items
	for (const item of items) {
		if (item.type === "message" && item.id) {
			seenByMap.set(item.id, new Set());
		}
	}

	// Process seen data for each viewer
	for (const seen of seenData) {
		const seenTime = getTimestamp(seen.lastSeenAt);
		const viewerId = seen.userId || seen.visitorId || seen.aiAgentId;
		if (!viewerId) {
			continue;
		}

		let lastReadItem: TimelineItem | null = null;
		let unreadCount = 0;

		// Process items in chronological order (using pre-sorted array)
		for (let index = 0; index < sortedMessageItems.length; index++) {
			const item = sortedMessageItems[index];
			const itemTime =
				sortedMessageTimes[index] ?? getTimestamp(item.createdAt);

			if (itemTime <= seenTime) {
				// This item has been seen
				if (item.id) {
					const seenBy = seenByMap.get(item.id);
					if (seenBy) {
						seenBy.add(viewerId);
					}
				}
				lastReadItem = item;
			} else {
				// This item is unread
				unreadCount++;
			}
		}

		// Store the last read item for this viewer
		if (lastReadItem?.id) {
			lastReadMessageMap.set(viewerId, lastReadItem.id);
		}

		// Store unread count
		unreadCountMap.set(viewerId, unreadCount);
	}

	return { seenByMap, lastReadMessageMap, unreadCountMap };
};

/**
 * Batches sequential timeline items from the same sender into groups and enriches
 * them with read-receipt helpers so UIs can render conversation timelines with
 * minimal effort. Seen data is normalised into quick lookup maps for unread
 * indicators.
 */
export const useGroupedMessages = ({
	items,
	seenData = [],
	currentViewerId,
}: UseGroupedMessagesOptions) => {
	return useMemo(() => {
		const groupedItems = groupTimelineItems(items);

		// Pre-compute message items and timestamps once for reuse
		const messageItems = items.filter((item) => item.type === "message");
		let sortedMessageItems = messageItems;
		let sortedMessageTimes = messageItems.map((item) =>
			getTimestamp(item.createdAt)
		);

		// Avoid sorting if items are already in chronological order
		let isSorted = true;
		for (let index = 1; index < sortedMessageTimes.length; index++) {
			if (sortedMessageTimes[index] < sortedMessageTimes[index - 1]) {
				isSorted = false;
				break;
			}
		}

		if (!isSorted) {
			const itemsWithTimes = messageItems.map((item, index) => ({
				item,
				time: sortedMessageTimes[index] ?? 0,
			}));

			itemsWithTimes.sort((a, b) => a.time - b.time);

			sortedMessageItems = itemsWithTimes.map((entry) => entry.item);
			sortedMessageTimes = itemsWithTimes.map((entry) => entry.time);
		}

		// Build index map from sorted items for O(1) chronological lookups
		// Must use sortedMessageItems (not raw items) to ensure indices reflect time order
		const messageIndexMap = new Map<string, number>();
		for (let i = 0; i < sortedMessageItems.length; i++) {
			const item = sortedMessageItems[i];
			if (item?.id) {
				messageIndexMap.set(item.id, i);
			}
		}

		// Build read receipt data with pre-sorted items
		const { seenByMap, lastReadMessageMap, unreadCountMap } =
			buildTimelineReadReceiptData(
				seenData,
				items,
				sortedMessageItems,
				sortedMessageTimes
			);

		// Cache for turning seen sets into stable arrays across renders
		const seenByArrayCache = new Map<string, readonly string[]>();

		return {
			items: groupedItems,
			seenByMap,
			lastReadMessageMap,
			unreadCountMap,

			isMessageSeenByViewer: (messageId: string): boolean => {
				if (!currentViewerId) {
					return false;
				}
				const seenBy = seenByMap.get(messageId);
				return seenBy ? seenBy.has(currentViewerId) : false;
			},

			getMessageSeenBy: (messageId: string): readonly string[] => {
				if (seenByArrayCache.has(messageId)) {
					return seenByArrayCache.get(messageId) ?? EMPTY_STRING_ARRAY;
				}

				const seenBy = seenByMap.get(messageId);
				if (!seenBy || seenBy.size === 0) {
					seenByArrayCache.set(messageId, EMPTY_STRING_ARRAY);
					return EMPTY_STRING_ARRAY;
				}

				const result = Object.freeze(Array.from(seenBy)) as readonly string[];
				seenByArrayCache.set(messageId, result);
				return result;
			},

			getLastReadMessageId: (userId: string): string | undefined =>
				lastReadMessageMap.get(userId),

			isLastReadMessage: (messageId: string, userId: string): boolean =>
				lastReadMessageMap.get(userId) === messageId,

			getUnreadCount: (userId: string): number =>
				unreadCountMap.get(userId) || 0,

			hasUnreadAfter: (messageId: string, userId: string): boolean => {
				const lastRead = lastReadMessageMap.get(userId);
				if (!lastRead) {
					return true;
				}

				// Use index map for O(1) lookups instead of findIndex O(n)
				const messageIndex = messageIndexMap.get(messageId);
				const lastReadIndex = messageIndexMap.get(lastRead);

				if (messageIndex === undefined || lastReadIndex === undefined) {
					return true;
				}

				return messageIndex < lastReadIndex;
			},
		};
	}, [items, seenData, currentViewerId]);
};
