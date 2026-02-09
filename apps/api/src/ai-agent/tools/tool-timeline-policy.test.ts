import { describe, expect, it } from "bun:test";
import {
	getToolLogType,
	isConversationVisibleTool,
	TOOL_TIMELINE_CONVERSATION_ALLOWLIST,
} from "@cossistant/types";

describe("tool timeline policy", () => {
	it("uses expected default conversation allowlist", () => {
		expect(TOOL_TIMELINE_CONVERSATION_ALLOWLIST).toEqual([
			"searchKnowledgeBase",
			"updateConversationTitle",
			"updateSentiment",
			"setPriority",
		]);
	});

	it("marks allowlisted tools as conversation-visible", () => {
		expect(isConversationVisibleTool("searchKnowledgeBase")).toBe(true);
		expect(isConversationVisibleTool("updateConversationTitle")).toBe(true);
		expect(isConversationVisibleTool("updateSentiment")).toBe(true);
		expect(isConversationVisibleTool("setPriority")).toBe(true);
	});

	it("marks non-allowlisted tools as log-only", () => {
		expect(isConversationVisibleTool("sendMessage")).toBe(false);
		expect(getToolLogType("sendMessage")).toBe("log");
	});

	it("marks aiDecision as decision log type", () => {
		expect(isConversationVisibleTool("aiDecision")).toBe(false);
		expect(getToolLogType("aiDecision")).toBe("decision");
	});
});
