import { describe, expect, it } from "bun:test";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ConversationHeader } from "@/contexts/inboxes";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import { FakeConversationTimelineList } from "./fake-conversation-timeline-list";

function createTimelineItem(overrides: Partial<TimelineItem>): TimelineItem {
	return {
		id: "item-1",
		conversationId: "conv-1",
		organizationId: "org-1",
		visibility: "public",
		type: "event",
		text: null,
		parts: [],
		userId: null,
		visitorId: null,
		aiAgentId: null,
		tool: null,
		createdAt: "2026-01-01T10:00:00.000Z",
		deletedAt: null,
		...overrides,
	};
}

function createEventItem(id: string, createdAt: string): TimelineItem {
	return createTimelineItem({
		id,
		type: "event",
		userId: "01JGUSER1111111111111111",
		createdAt,
		parts: [
			{
				type: "event",
				eventType: "participant_joined",
				actorUserId: "01JGUSER1111111111111111",
				actorAiAgentId: null,
				targetUserId: null,
				targetAiAgentId: null,
				message: null,
			},
		],
	});
}

function createToolItem(id: string, createdAt: string): TimelineItem {
	return createTimelineItem({
		id,
		type: "tool",
		userId: "01JGUSER1111111111111111",
		text: "Updated sentiment to positive",
		tool: "updateSentiment",
		createdAt,
		parts: [
			{
				type: "tool-updateSentiment",
				toolCallId: `${id}-call`,
				toolName: "updateSentiment",
				input: {},
				state: "result",
			},
		],
	});
}

const VISITOR = {
	id: "visitor-1",
	contact: {
		name: "Marc",
		email: "marc@example.com",
		image: null,
	},
} as unknown as ConversationHeader["visitor"];

describe("FakeDashboard timeline activity grouping", () => {
	it("uses grouped bullet icons and keeps sender identity visible", () => {
		const items = [
			createEventItem("event-1", "2026-01-01T10:00:00.000Z"),
			createToolItem("tool-1", "2026-01-01T10:01:00.000Z"),
		] as unknown as ConversationTimelineItem[];

		const html = renderToStaticMarkup(
			React.createElement(FakeConversationTimelineList, {
				items,
				visitor: VISITOR,
				typingVisitors: [],
			})
		);

		expect(html).toContain('data-activity-bullet="event"');
		expect(html).toContain('data-activity-bullet="tool"');
		expect(html).toContain('data-event-action-icon="participant_joined"');
		expect(html).toContain('data-tool-action-icon="updateSentiment"');
		expect(html).toContain('data-slot="avatar"');
		expect(html).not.toContain("flex-row-reverse");
		expect(html).not.toContain("mb-2 px-1 text-muted-foreground text-xs");
	});
});
