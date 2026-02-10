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
		text: "Looking in knowledge base...",
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

function render(item: TimelineItem, mode?: "default" | "developer"): string {
	return renderToStaticMarkup(React.createElement(ToolCall, { item, mode }));
}

describe("ToolCall", () => {
	it("renders mapped icon for known tools", () => {
		const html = render(createToolTimelineItem());
		expect(html).toContain('data-activity-icon="searchKnowledgeBase"');
	});

	it("renders default icon when tool has no specific icon mapping", () => {
		const html = render(
			createToolTimelineItem({
				text: "Running sendMessage",
				parts: [
					{
						type: "tool-sendMessage",
						toolCallId: "call-unknown",
						toolName: "sendMessage",
						input: { message: "Hello there" },
						state: "partial",
					},
				],
				tool: "sendMessage",
			})
		);

		expect(html).toContain('data-activity-icon="default"');
	});

	it("renders partial state as inline activity with spinner-friendly text", () => {
		const html = render(createToolTimelineItem());
		expect(html).toContain("Searching knowledge base...");
	});

	it("renders result state with source count", () => {
		const html = render(
			createToolTimelineItem({
				parts: [
					{
						type: "tool-searchKnowledgeBase",
						toolCallId: "call-2",
						toolName: "searchKnowledgeBase",
						input: { query: "pricing" },
						state: "result",
						output: {
							success: true,
							data: { totalFound: 3, articles: [] },
						},
					},
				],
			})
		);

		expect(html).toContain("Found 3 sources");
	});

	it("renders error state with friendly error text", () => {
		const html = render(
			createToolTimelineItem({
				text: "Knowledge base lookup failed",
				parts: [
					{
						type: "tool-searchKnowledgeBase",
						toolCallId: "call-3",
						toolName: "searchKnowledgeBase",
						input: { query: "pricing" },
						state: "error",
						errorText: "Connection timeout",
					},
				],
			})
		);

		expect(html).toContain("Knowledge base lookup failed");
	});

	it("falls back to derived summary when item text is missing", () => {
		const html = render(
			createToolTimelineItem({
				text: null,
				parts: [
					{
						type: "tool-sendMessage",
						toolCallId: "call-4",
						toolName: "sendMessage",
						input: { message: "hello" },
						state: "partial",
					},
				],
			})
		);

		expect(html).toContain("Running sendMessage");
	});

	it("renders developer mode metadata badges and payload", () => {
		const html = render(createToolTimelineItem(), "developer");

		expect(html).toContain("AI agent dev log");
		expect(html).toContain("Customer");
		expect(html).toContain("Dev payload");
		expect(html).toContain("tool");
		expect(html).toContain("call-1");
	});

	it("renders developer-mode fallback when strict tool part parsing fails", () => {
		const html = render(
			createToolTimelineItem({
				parts: [],
				text: null,
				tool: "sendMessage",
			}),
			"developer"
		);

		expect(html).toContain("AI agent dev log");
		expect(html).toContain("Fallback rendered from timeline metadata.");
		expect(html).toContain("sendMessage");
		expect(html).toContain("tool-1");
	});

	it("renders updateConversationTitle with quoted title on result", () => {
		const html = render(
			createToolTimelineItem({
				text: 'Updated conversation title to "Help with billing"',
				parts: [
					{
						type: "tool-updateConversationTitle",
						toolCallId: "call-5",
						toolName: "updateConversationTitle",
						input: { title: "Help with billing" },
						state: "result",
						output: {
							success: true,
							data: { title: "Help with billing" },
						},
					},
				],
				tool: "updateConversationTitle",
			})
		);

		expect(html).toContain("Help with billing");
		expect(html).toContain("Changed title to");
	});

	it("renders updateSentiment with sentiment value", () => {
		const html = render(
			createToolTimelineItem({
				text: "Updated sentiment to positive",
				parts: [
					{
						type: "tool-updateSentiment",
						toolCallId: "call-6",
						toolName: "updateSentiment",
						input: {},
						state: "result",
						output: {
							success: true,
							data: { sentiment: "positive" },
						},
					},
				],
				tool: "updateSentiment",
			})
		);

		expect(html).toContain("Sentiment:");
		expect(html).toContain("positive");
	});

	it("renders setPriority with priority badge", () => {
		const html = render(
			createToolTimelineItem({
				text: "Priority set to high",
				parts: [
					{
						type: "tool-setPriority",
						toolCallId: "call-7",
						toolName: "setPriority",
						input: {},
						state: "result",
						output: { success: true, data: { priority: "high" } },
					},
				],
				tool: "setPriority",
			})
		);

		expect(html).toContain("Conversation priority set to");
		expect(html).toContain("high");
	});
});
