import { describe, expect, it } from "bun:test";
import type { AvailableAIAgent, AvailableHumanAgent } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

function createToolItem(
	id: string,
	createdAt: string,
	toolName: "updateSentiment" | "updateConversationTitle" = "updateSentiment"
): TimelineItem {
	return createTimelineItem({
		id,
		type: "tool",
		userId: "user-1",
		text:
			toolName === "updateConversationTitle"
				? 'Changed title to "Billing question"'
				: "Updated sentiment to positive",
		tool: toolName,
		createdAt,
		parts: [
			{
				type: `tool-${toolName}`,
				toolCallId: `${id}-call`,
				toolName,
				input: {},
				state: "result",
			},
		],
	});
}

const AVAILABLE_AI_AGENTS: AvailableAIAgent[] = [];
const AVAILABLE_HUMAN_AGENTS: AvailableHumanAgent[] = [
	{
		id: "user-1",
		name: "Anthony Riera",
		image: null,
		lastSeenAt: null,
	},
];

function renderTimeline(items: TimelineItem[]): string {
	return renderToStaticMarkup(
		React.createElement(FakeConversationTimelineList, {
			conversationId: "conv-1",
			items,
			availableAIAgents: AVAILABLE_AI_AGENTS,
			availableHumanAgents: AVAILABLE_HUMAN_AGENTS,
			currentVisitorId: "visitor-1",
			typingVisitors: [],
		})
	);
}

describe("FakeSupportWidget timeline activity grouping", () => {
	it("renders grouped activity bullets with action icons for multi-row groups", () => {
		const html = renderTimeline([
			createToolItem("tool-1", "2026-01-01T10:00:00.000Z", "updateSentiment"),
			createToolItem(
				"tool-2",
				"2026-01-01T10:01:00.000Z",
				"updateConversationTitle"
			),
		]);

		expect(html).toContain('data-activity-bullet="tool"');
		expect(html).toContain('data-tool-action-icon="updateSentiment"');
		expect(html).toContain('data-tool-action-icon="updateConversationTitle"');
		expect(html).not.toContain("flex-row-reverse");
		expect(html).not.toContain("px-1 text-co-muted-foreground text-xs");
	});

	it("keeps single-row activity groups icon-free", () => {
		const html = renderTimeline([
			createToolItem("tool-1", "2026-01-01T10:00:00.000Z"),
		]);

		expect(html).not.toContain("data-activity-bullet=");
		expect(html).not.toContain("data-tool-action-icon=");
		expect(html).not.toContain("data-event-action-icon=");
	});
});
