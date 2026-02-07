import { describe, expect, it } from "bun:test";
import { mapTimelineRowToTimelineItem } from "./conversation";

describe("mapTimelineRowToTimelineItem", () => {
	it("maps tool timeline rows and derives tool name from parts", () => {
		const row = {
			id: "01HROW00000000000000000000",
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
		} as never;

		const mapped = mapTimelineRowToTimelineItem(row);

		expect(mapped).not.toBeNull();
		expect(mapped?.type).toBe("tool");
		expect(mapped?.tool).toBe("searchKnowledgeBase");
	});

	it("returns null for rows with invalid parts", () => {
		const row = {
			id: "01HROW00000000000000000000",
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
					// input is required for tool parts, so this should fail parsing
					state: "partial",
				},
			],
			userId: null,
			visitorId: "visitor-1",
			aiAgentId: "ai-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			deletedAt: null,
		} as never;

		const mapped = mapTimelineRowToTimelineItem(row);
		expect(mapped).toBeNull();
	});
});
