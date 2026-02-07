import { describe, expect, it } from "bun:test";
import type { ConversationSeen, TimelineItem } from "@cossistant/types";
import { SenderType } from "@cossistant/types";

import type {
	ConversationItem,
	DaySeparatorItem,
} from "./use-grouped-messages";

// Import the internal functions we need to test
// Since useGroupedMessages is a hook, we'll test the underlying logic directly
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
): {
	senderId: string;
	senderType: (typeof SenderType)[keyof typeof SenderType];
} => {
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

const getToolNameFromTimelineItem = (item: TimelineItem): string | null => {
	if (item.tool) {
		return item.tool;
	}

	for (const part of item.parts) {
		if (
			typeof part === "object" &&
			part !== null &&
			"type" in part &&
			"toolName" in part &&
			typeof part.type === "string" &&
			part.type.startsWith("tool-") &&
			typeof part.toolName === "string"
		) {
			return part.toolName;
		}
	}

	return null;
};

// Copy of groupTimelineItems for testing (same as in use-grouped-messages.ts)
const groupTimelineItems = (items: TimelineItem[]): ConversationItem[] => {
	const result: ConversationItem[] = [];
	let currentGroup: ConversationItem | null = null;
	let currentDayString: string | null = null;

	const maybeInsertDaySeparator = (itemDate: Date): void => {
		const itemDayString = getDateString(itemDate);

		if (currentDayString !== itemDayString) {
			// Finalize any existing group before inserting day separator
			if (currentGroup && currentGroup.type === "message_group") {
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
			if (currentGroup && currentGroup.type === "message_group") {
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

		if (item.type === "identification" || item.type === "tool") {
			// Finalize any existing group
			if (currentGroup && currentGroup.type === "message_group") {
				result.push(currentGroup);
				currentGroup = null;
			}

			// Add tool item as standalone entry
			result.push({
				type: "timeline_tool",
				item,
				tool: getToolNameFromTimelineItem(item),
				timestamp: itemDate,
			});
			continue;
		}

		// Group messages by sender
		const { senderId, senderType } = getSenderIdAndTypeFromTimelineItem(item);

		if (
			currentGroup &&
			currentGroup.type === "message_group" &&
			currentGroup.senderId === senderId
		) {
			// Add to existing group (day boundary already handled above)
			currentGroup.items.push(item);
			currentGroup.lastMessageId = item.id || currentGroup.lastMessageId;
			currentGroup.lastMessageTime = itemDate;
		} else {
			// Finalize previous group if exists
			if (currentGroup && currentGroup.type === "message_group") {
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

	if (currentGroup && currentGroup.type === "message_group") {
		result.push(currentGroup);
	}

	return result;
};

// Simplified version of buildTimelineReadReceiptData for testing
const buildTimelineReadReceiptData = (
	seenData: ConversationSeen[],
	items: TimelineItem[]
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

	// Sort items by time to process in order
	const sortedItems = [...items]
		.filter((item) => item.type === "message")
		.sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));

	// Process seen data for each viewer
	for (const seen of seenData) {
		const seenTime = getTimestamp(seen.lastSeenAt);
		const viewerId = seen.userId || seen.visitorId || seen.aiAgentId;
		if (!viewerId) {
			continue;
		}

		let lastReadItem: TimelineItem | null = null;
		let unreadCount = 0;

		// Process items in chronological order
		for (const item of sortedItems) {
			const itemTime = getTimestamp(item.createdAt);

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

function createTimelineItem(
	overrides: Partial<TimelineItem> = {}
): TimelineItem {
	const base: TimelineItem = {
		id: "item-1",
		conversationId: "conv-1",
		organizationId: "org-1",
		visibility: "public",
		type: "message",
		text: "Hello",
		parts: [],
		userId: null,
		visitorId: "visitor-1",
		aiAgentId: null,
		createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
		deletedAt: null,
	};

	return { ...base, ...overrides };
}

function createSeenEntry(
	overrides: Partial<ConversationSeen> = {}
): ConversationSeen {
	const base: ConversationSeen = {
		id: "seen-1",
		conversationId: "conv-1",
		userId: "user-1",
		visitorId: null,
		aiAgentId: null,
		lastSeenAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
		createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
		updatedAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
		deletedAt: null,
	};

	return { ...base, ...overrides };
}

describe("buildTimelineReadReceiptData", () => {
	it("uses lastSeenAt instead of updatedAt for read receipt computation", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:05:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:10:00.000Z").toISOString(),
			}),
		];

		// Visitor saw messages up to 10:07 (lastSeenAt)
		// but updatedAt is 10:15 (later update to the seen record)
		const seenData: ConversationSeen[] = [
			createSeenEntry({
				userId: null,
				visitorId: "visitor-1",
				lastSeenAt: new Date("2024-01-01T10:07:00.000Z").toISOString(),
				updatedAt: new Date("2024-01-01T10:15:00.000Z").toISOString(),
			}),
		];

		const { seenByMap } = buildTimelineReadReceiptData(seenData, items);

		// Visitor should have seen msg-1 and msg-2 (both before 10:07)
		expect(seenByMap.get("msg-1")?.has("visitor-1")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("visitor-1")).toBe(true);

		// Visitor should NOT have seen msg-3 (after 10:07)
		expect(seenByMap.get("msg-3")?.has("visitor-1")).toBe(false);
	});

	it("correctly handles multiple viewers with different lastSeenAt timestamps", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:05:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:10:00.000Z").toISOString(),
			}),
		];

		const seenData: ConversationSeen[] = [
			createSeenEntry({
				id: "seen-visitor",
				userId: null,
				visitorId: "visitor-1",
				lastSeenAt: new Date("2024-01-01T10:03:00.000Z").toISOString(),
				updatedAt: new Date("2024-01-01T10:03:00.000Z").toISOString(),
			}),
			createSeenEntry({
				id: "seen-user",
				userId: "user-2",
				visitorId: null,
				lastSeenAt: new Date("2024-01-01T10:08:00.000Z").toISOString(),
				updatedAt: new Date("2024-01-01T10:08:00.000Z").toISOString(),
			}),
		];

		const { seenByMap } = buildTimelineReadReceiptData(seenData, items);

		// Visitor-1 saw only msg-1 (before 10:03)
		expect(seenByMap.get("msg-1")?.has("visitor-1")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("visitor-1")).toBe(false);

		// User-2 saw msg-1 and msg-2 (both before 10:08)
		expect(seenByMap.get("msg-1")?.has("user-2")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("user-2")).toBe(true);
		expect(seenByMap.get("msg-3")?.has("user-2")).toBe(false);
	});

	it("handles large timelines without corrupting read receipts", () => {
		const baseTime = new Date("2024-01-01T00:00:00.000Z").getTime();
		const items: TimelineItem[] = Array.from({ length: 500 }, (_, index) =>
			createTimelineItem({
				id: `msg-${index}`,
				userId: "user-1",
				visitorId: null,
				createdAt: new Date(baseTime + index * 1000).toISOString(),
			})
		);

		const seenData: ConversationSeen[] = [
			createSeenEntry({
				userId: null,
				visitorId: "visitor-1",
				lastSeenAt: new Date(baseTime + 249 * 1000).toISOString(),
			}),
		];

		const { seenByMap } = buildTimelineReadReceiptData(seenData, items);

		expect(seenByMap.get("msg-0")?.has("visitor-1")).toBe(true);
		expect(seenByMap.get("msg-249")?.has("visitor-1")).toBe(true);
		expect(seenByMap.get("msg-250")?.has("visitor-1")).toBe(false);
	});

	it("does NOT extend seen time to include viewer's own messages sent after lastSeenAt", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: null,
				visitorId: "visitor-1",
				createdAt: new Date("2024-01-01T10:05:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:10:00.000Z").toISOString(),
			}),
		];

		// Visitor's lastSeenAt is 10:03, and they sent a message at 10:05
		// With the fix, their seen time should remain at 10:03
		const seenData: ConversationSeen[] = [
			createSeenEntry({
				userId: null,
				visitorId: "visitor-1",
				lastSeenAt: new Date("2024-01-01T10:03:00.000Z").toISOString(),
				updatedAt: new Date("2024-01-01T10:03:00.000Z").toISOString(),
			}),
		];

		const { seenByMap } = buildTimelineReadReceiptData(seenData, items);

		// Visitor should have seen msg-1 (before 10:03)
		expect(seenByMap.get("msg-1")?.has("visitor-1")).toBe(true);

		// Visitor should NOT have seen msg-2 (their own message sent after lastSeenAt)
		expect(seenByMap.get("msg-2")?.has("visitor-1")).toBe(false);

		// Visitor should NOT have seen msg-3 (after their lastSeenAt)
		expect(seenByMap.get("msg-3")?.has("visitor-1")).toBe(false);
	});

	it("correctly handles visitor leaves scenario where dashboard user sends messages", () => {
		// Scenario: Visitor sends message, leaves, dashboard user responds
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: null,
				visitorId: "visitor-1",
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
				text: "Hello, I need help",
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "dashboard-user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:05:00.000Z").toISOString(),
				text: "Hi! How can I help you?",
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "dashboard-user-1",
				visitorId: null,
				createdAt: new Date("2024-01-01T10:06:00.000Z").toISOString(),
				text: "Are you still there?",
			}),
		];

		// Visitor saw only up to their own message (they left immediately after sending)
		const seenData: ConversationSeen[] = [
			createSeenEntry({
				userId: null,
				visitorId: "visitor-1",
				lastSeenAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
			}),
			createSeenEntry({
				userId: "dashboard-user-1",
				visitorId: null,
				lastSeenAt: new Date("2024-01-01T10:06:00.000Z").toISOString(),
			}),
		];

		const { seenByMap, unreadCountMap } = buildTimelineReadReceiptData(
			seenData,
			items
		);

		// Visitor should have seen only msg-1 (their own message at exactly lastSeenAt)
		expect(seenByMap.get("msg-1")?.has("visitor-1")).toBe(true);

		// Visitor should NOT have seen dashboard user's responses
		expect(seenByMap.get("msg-2")?.has("visitor-1")).toBe(false);
		expect(seenByMap.get("msg-3")?.has("visitor-1")).toBe(false);

		// Visitor should have 2 unread messages
		expect(unreadCountMap.get("visitor-1")).toBe(2);

		// Dashboard user should have seen all messages
		expect(seenByMap.get("msg-1")?.has("dashboard-user-1")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("dashboard-user-1")).toBe(true);
		expect(seenByMap.get("msg-3")?.has("dashboard-user-1")).toBe(true);
		expect(unreadCountMap.get("dashboard-user-1")).toBe(0);
	});

	it("correctly handles AI agent read receipts using aiAgentId", () => {
		// Scenario: AI agent responds to visitor and marks messages as read
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: null,
				visitorId: "visitor-1",
				aiAgentId: null,
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
				text: "Hello, I need help with my order",
			}),
			createTimelineItem({
				id: "msg-2",
				userId: null,
				visitorId: null,
				aiAgentId: "ai-agent-1",
				createdAt: new Date("2024-01-01T10:01:00.000Z").toISOString(),
				text: "Hi! I'd be happy to help. What's your order number?",
			}),
			createTimelineItem({
				id: "msg-3",
				userId: null,
				visitorId: "visitor-1",
				aiAgentId: null,
				createdAt: new Date("2024-01-01T10:02:00.000Z").toISOString(),
				text: "Order #12345",
			}),
		];

		// AI agent has seen up to 10:02 (all messages)
		// Visitor has seen up to 10:01 (first two messages)
		const seenData: ConversationSeen[] = [
			createSeenEntry({
				id: "seen-ai",
				userId: null,
				visitorId: null,
				aiAgentId: "ai-agent-1",
				lastSeenAt: new Date("2024-01-01T10:02:30.000Z").toISOString(),
			}),
			createSeenEntry({
				id: "seen-visitor",
				userId: null,
				visitorId: "visitor-1",
				aiAgentId: null,
				lastSeenAt: new Date("2024-01-01T10:01:30.000Z").toISOString(),
			}),
		];

		const { seenByMap, lastReadMessageMap, unreadCountMap } =
			buildTimelineReadReceiptData(seenData, items);

		// AI agent should have seen all messages
		expect(seenByMap.get("msg-1")?.has("ai-agent-1")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("ai-agent-1")).toBe(true);
		expect(seenByMap.get("msg-3")?.has("ai-agent-1")).toBe(true);

		// AI agent's last read message should be msg-3
		expect(lastReadMessageMap.get("ai-agent-1")).toBe("msg-3");

		// AI agent should have 0 unread messages
		expect(unreadCountMap.get("ai-agent-1")).toBe(0);

		// Visitor should have seen msg-1 and msg-2 (before 10:01:30)
		expect(seenByMap.get("msg-1")?.has("visitor-1")).toBe(true);
		expect(seenByMap.get("msg-2")?.has("visitor-1")).toBe(true);

		// Visitor should NOT have seen msg-3 (after 10:01:30)
		expect(seenByMap.get("msg-3")?.has("visitor-1")).toBe(false);

		// Visitor should have 1 unread message
		expect(unreadCountMap.get("visitor-1")).toBe(1);
	});

	it("correctly identifies AI agent as sender type", () => {
		// Verify that getSenderIdAndTypeFromTimelineItem correctly identifies AI agents
		const aiAgentItem = createTimelineItem({
			id: "msg-1",
			userId: null,
			visitorId: null,
			aiAgentId: "ai-agent-1",
		});

		const { senderId, senderType } =
			getSenderIdAndTypeFromTimelineItem(aiAgentItem);

		expect(senderId).toBe("ai-agent-1");
		expect(senderType).toBe(SenderType.AI);
	});

	it("groups AI agent messages separately from human agent messages", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: null,
				visitorId: null,
				aiAgentId: "ai-agent-1",
				createdAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: null,
				visitorId: null,
				aiAgentId: "ai-agent-1",
				createdAt: new Date("2024-01-01T10:01:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "human-agent-1",
				visitorId: null,
				aiAgentId: null,
				createdAt: new Date("2024-01-01T10:02:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have: day separator + AI agent group + human agent group
		expect(result.length).toBe(3);
		expect(result[0]?.type).toBe("day_separator");

		if (result[1]?.type === "message_group") {
			expect(result[1].senderId).toBe("ai-agent-1");
			expect(result[1].senderType).toBe(SenderType.AI);
			expect(result[1].items.length).toBe(2);
		}

		if (result[2]?.type === "message_group") {
			expect(result[2].senderId).toBe("human-agent-1");
			expect(result[2].senderType).toBe(SenderType.TEAM_MEMBER);
			expect(result[2].items.length).toBe(1);
		}
	});
});

describe("groupTimelineItems - day separator", () => {
	it("does not insert day separator for messages on the same day", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T14:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-3",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T18:00:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have 1 day separator + 1 message group
		expect(result.length).toBe(2);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");

		// All messages should be in the same group
		if (result[1]?.type === "message_group") {
			expect(result[1].items.length).toBe(3);
		}
	});

	it("inserts day separator when day changes between messages", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T23:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-16T01:00:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have: day separator 1 + message group 1 + day separator 2 + message group 2
		expect(result.length).toBe(4);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");
		expect(result[2]?.type).toBe("day_separator");
		expect(result[3]?.type).toBe("message_group");

		// Verify day separator dates
		if (result[0]?.type === "day_separator") {
			expect(result[0].dateString).toBe("2024-01-15");
		}
		if (result[2]?.type === "day_separator") {
			expect(result[2].dateString).toBe("2024-01-16");
		}
	});

	it("inserts multiple day separators for gaps spanning multiple days", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-10T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T10:00:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have: day separator 1 + message group 1 + day separator 2 + message group 2
		// (Not multiple separators for each day in between, just when messages occur)
		expect(result.length).toBe(4);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");
		expect(result[2]?.type).toBe("day_separator");
		expect(result[3]?.type).toBe("message_group");

		// Verify the dates
		if (result[0]?.type === "day_separator") {
			expect(result[0].dateString).toBe("2024-01-10");
		}
		if (result[2]?.type === "day_separator") {
			expect(result[2].dateString).toBe("2024-01-15");
		}
	});

	it("inserts day separator before events", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "event-1",
				type: "event",
				userId: null,
				visitorId: null,
				createdAt: new Date("2024-01-16T10:00:00.000Z").toISOString(),
				parts: [
					{
						type: "event",
						eventType: "assigned",
						actorUserId: "user-1",
						actorAiAgentId: null,
						targetUserId: "user-2",
						targetAiAgentId: null,
					},
				],
			}),
		];

		const result = groupTimelineItems(items);

		// Should have: day separator 1 + message group + day separator 2 + event
		expect(result.length).toBe(4);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");
		expect(result[2]?.type).toBe("day_separator");
		expect(result[3]?.type).toBe("timeline_event");
	});

	it("inserts day separator before tool items", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "tool-1",
				type: "identification",
				tool: "email_collector",
				userId: null,
				visitorId: null,
				aiAgentId: "ai-1",
				createdAt: new Date("2024-01-16T10:00:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have: day separator 1 + message group + day separator 2 + tool
		expect(result.length).toBe(4);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");
		expect(result[2]?.type).toBe("day_separator");
		expect(result[3]?.type).toBe("timeline_tool");
	});

	it("groups timeline type 'tool' as timeline_tool and extracts toolName from part", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T10:00:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "tool-2",
				type: "tool",
				tool: null,
				userId: null,
				visitorId: null,
				aiAgentId: "ai-1",
				createdAt: new Date("2024-01-16T10:00:00.000Z").toISOString(),
				parts: [
					{
						type: "tool-searchKnowledgeBase",
						toolCallId: "call-1",
						toolName: "searchKnowledgeBase",
						input: { query: "pricing" },
						state: "partial",
					},
				],
			}),
		];

		const result = groupTimelineItems(items);
		const toolItem = result[3];

		expect(toolItem?.type).toBe("timeline_tool");
		if (toolItem?.type === "timeline_tool") {
			expect(toolItem.tool).toBe("searchKnowledgeBase");
		}
	});

	it("breaks message groups at day boundaries even for same sender", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-15T23:30:00.000Z").toISOString(),
			}),
			createTimelineItem({
				id: "msg-2",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-01-16T00:30:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		// Should have separate groups for each day
		expect(result.length).toBe(4);
		expect(result[0]?.type).toBe("day_separator");
		expect(result[1]?.type).toBe("message_group");
		expect(result[2]?.type).toBe("day_separator");
		expect(result[3]?.type).toBe("message_group");

		// Each message group should have exactly 1 message
		if (result[1]?.type === "message_group") {
			expect(result[1].items.length).toBe(1);
			expect(result[1].items[0]?.id).toBe("msg-1");
		}
		if (result[3]?.type === "message_group") {
			expect(result[3].items.length).toBe(1);
			expect(result[3].items[0]?.id).toBe("msg-2");
		}
	});

	it("handles empty items array", () => {
		const result = groupTimelineItems([]);
		expect(result.length).toBe(0);
	});

	it("creates day separator with correct date at midnight", () => {
		const items: TimelineItem[] = [
			createTimelineItem({
				id: "msg-1",
				userId: "user-1",
				visitorId: null,
				createdAt: new Date("2024-06-20T15:30:00.000Z").toISOString(),
			}),
		];

		const result = groupTimelineItems(items);

		expect(result.length).toBe(2);
		expect(result[0]?.type).toBe("day_separator");

		if (result[0]?.type === "day_separator") {
			expect(result[0].dateString).toBe("2024-06-20");
			// The date should be at midnight
			expect(result[0].date.getHours()).toBe(0);
			expect(result[0].date.getMinutes()).toBe(0);
			expect(result[0].date.getSeconds()).toBe(0);
		}
	});
});
