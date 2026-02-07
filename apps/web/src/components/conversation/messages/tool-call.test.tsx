import { describe, expect, it } from "bun:test";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolCall } from "./tool-call";

function createToolTimelineItem(
	overrides: Partial<TimelineItem> = {}
): TimelineItem {
	return {
		id: "tool-1",
		conversationId: "conv-1",
		organizationId: "org-1",
		visibility: "private",
		type: "tool",
		text: "Tool call: searchKnowledgeBase",
		parts: [
			{
				type: "tool-searchKnowledgeBase",
				toolCallId: "call-1",
				toolName: "searchKnowledgeBase",
				input: { query: "pricing" },
				state: "partial",
			},
		],
		userId: null,
		visitorId: "visitor-1",
		aiAgentId: "ai-1",
		createdAt: "2026-01-01T00:00:00.000Z",
		deletedAt: null,
		tool: "searchKnowledgeBase",
		...overrides,
	};
}

function render(item: TimelineItem): string {
	return renderToStaticMarkup(React.createElement(ToolCall, { item }));
}

describe("ToolCall", () => {
	it("renders partial state", () => {
		const html = render(createToolTimelineItem());
		expect(html).toContain("searchKnowledgeBase");
		expect(html).toContain("Running");
		expect(html).toContain("Debug details");
		expect(html).toContain('Call ID: <span class="font-mono">call-1</span>');
	});

	it("renders result state with output details", () => {
		const html = render(
			createToolTimelineItem({
				parts: [
					{
						type: "tool-searchKnowledgeBase",
						toolCallId: "call-2",
						toolName: "searchKnowledgeBase",
						input: { query: "pricing" },
						state: "result",
						output: { success: true, data: { totalFound: 1 } },
					},
				],
			})
		);

		expect(html).toContain("Success");
		expect(html).toContain("Output");
		expect(html).toContain("totalFound");
	});

	it("renders error state with error details", () => {
		const html = render(
			createToolTimelineItem({
				parts: [
					{
						type: "tool-sendMessage",
						toolCallId: "call-3",
						toolName: "sendMessage",
						input: { message: "hello" },
						state: "error",
						errorText: "Could not send",
					},
				],
			})
		);

		expect(html).toContain("Error");
		expect(html).toContain("Could not send");
	});
});
