import { describe, expect, it } from "bun:test";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import {
	getToolTimelineLogType,
	shouldDisplayToolTimelineItem,
} from "./tool-timeline-visibility";

function createToolItem(
	overrides: Partial<TimelineItem> = {},
	partOverrides: Record<string, unknown> = {}
): TimelineItem {
	return {
		id: "tool-1",
		conversationId: "conv-1",
		organizationId: "org-1",
		visibility: "private",
		type: "tool",
		text: "Tool call",
		parts: [
			{
				type: "tool-sendMessage",
				toolCallId: "call-1",
				toolName: "sendMessage",
				input: {},
				state: "partial",
				...partOverrides,
			},
		],
		userId: null,
		visitorId: "visitor-1",
		aiAgentId: "ai-1",
		createdAt: "2026-02-01T00:00:00.000Z",
		deletedAt: null,
		tool: "sendMessage",
		...overrides,
	};
}

describe("tool timeline visibility", () => {
	it("reads log type from callProviderMetadata first", () => {
		const item = createToolItem(
			{},
			{
				callProviderMetadata: {
					cossistant: {
						toolTimeline: {
							logType: "customer_facing",
						},
					},
				},
			}
		);

		expect(getToolTimelineLogType(item)).toBe("customer_facing");
		expect(shouldDisplayToolTimelineItem(item)).toBe(true);
	});

	it("falls back to providerMetadata log type", () => {
		const item = createToolItem(
			{},
			{
				providerMetadata: {
					cossistant: {
						toolTimeline: {
							logType: "decision",
						},
					},
				},
			}
		);

		expect(getToolTimelineLogType(item)).toBe("decision");
		expect(shouldDisplayToolTimelineItem(item)).toBe(false);
	});

	it("falls back to allowlist policy for older rows without metadata", () => {
		const visibleItem = createToolItem(
			{ tool: "searchKnowledgeBase" },
			{
				type: "tool-searchKnowledgeBase",
				toolName: "searchKnowledgeBase",
			}
		);
		const hiddenItem = createToolItem();

		expect(getToolTimelineLogType(visibleItem)).toBe("customer_facing");
		expect(shouldDisplayToolTimelineItem(visibleItem)).toBe(true);

		expect(getToolTimelineLogType(hiddenItem)).toBe("log");
		expect(shouldDisplayToolTimelineItem(hiddenItem)).toBe(false);
	});
});
