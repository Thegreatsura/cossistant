import { describe, expect, it } from "bun:test";
import {
	buildVisitorContextPrompt,
	type VisitorContextInfo,
} from "./context-builder";
import { createAIAgentTools, getToolsForAgent } from "./tools";

describe("AI Agent Context Builder", () => {
	describe("buildVisitorContextPrompt", () => {
		it("returns empty string for null visitor info", () => {
			const result = buildVisitorContextPrompt(null);
			expect(result).toBe("");
		});

		it("returns empty string for visitor with no info", () => {
			const visitorInfo: VisitorContextInfo = {
				name: null,
				email: null,
				country: null,
				city: null,
				language: null,
				timezone: null,
				browser: null,
				device: null,
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toBe("");
		});

		it("includes visitor name when available", () => {
			const visitorInfo: VisitorContextInfo = {
				name: "John Doe",
				email: null,
				country: null,
				city: null,
				language: null,
				timezone: null,
				browser: null,
				device: null,
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toContain("- Name: John Doe");
		});

		it("includes visitor email when available", () => {
			const visitorInfo: VisitorContextInfo = {
				name: null,
				email: "john@example.com",
				country: null,
				city: null,
				language: null,
				timezone: null,
				browser: null,
				device: null,
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toContain("- Email: john@example.com");
		});

		it("includes combined location when city and country available", () => {
			const visitorInfo: VisitorContextInfo = {
				name: null,
				email: null,
				country: "United States",
				city: "New York",
				language: null,
				timezone: null,
				browser: null,
				device: null,
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toContain("- Location: New York, United States");
		});

		it("includes only country when city is not available", () => {
			const visitorInfo: VisitorContextInfo = {
				name: null,
				email: null,
				country: "France",
				city: null,
				language: null,
				timezone: null,
				browser: null,
				device: null,
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toContain("- Location: France");
		});

		it("includes all available info", () => {
			const visitorInfo: VisitorContextInfo = {
				name: "Jane Smith",
				email: "jane@example.com",
				country: "UK",
				city: "London",
				language: "en-GB",
				timezone: "Europe/London",
				browser: "Chrome",
				device: "Desktop",
			};
			const result = buildVisitorContextPrompt(visitorInfo);
			expect(result).toContain("## Current Visitor Information");
			expect(result).toContain("- Name: Jane Smith");
			expect(result).toContain("- Email: jane@example.com");
			expect(result).toContain("- Location: London, UK");
			expect(result).toContain("- Language: en-GB");
			expect(result).toContain("- Timezone: Europe/London");
			expect(result).toContain("- Browser: Chrome");
			expect(result).toContain("- Device: Desktop");
		});
	});
});

describe("AI Agent Tools", () => {
	describe("createAIAgentTools", () => {
		it("returns a tool set with expected tools", () => {
			const tools = createAIAgentTools();
			expect(tools).toBeDefined();
			expect(tools.searchKnowledgeBase).toBeDefined();
			expect(tools.getVisitorContext).toBeDefined();
			expect(tools.escalateToHuman).toBeDefined();
		});
	});

	describe("getToolsForAgent", () => {
		it("returns default tools when metadata is null", () => {
			const tools = getToolsForAgent(null);
			expect(tools).toBeDefined();
			expect(tools?.searchKnowledgeBase).toBeDefined();
		});

		it("returns undefined when tools are disabled", () => {
			const tools = getToolsForAgent({ disableTools: true });
			expect(tools).toBeUndefined();
		});

		it("filters tools based on enabledTools list", () => {
			const tools = getToolsForAgent({
				enabledTools: ["searchKnowledgeBase"],
			});
			expect(tools).toBeDefined();
			expect(tools?.searchKnowledgeBase).toBeDefined();
			expect(tools?.escalateToHuman).toBeUndefined();
		});

		it("returns undefined when enabledTools is empty array", () => {
			const tools = getToolsForAgent({ enabledTools: [] });
			expect(tools).toBeUndefined();
		});

		it("ignores invalid tool names in enabledTools", () => {
			const tools = getToolsForAgent({
				enabledTools: ["invalidTool", "searchKnowledgeBase"],
			});
			expect(tools).toBeDefined();
			expect(tools?.searchKnowledgeBase).toBeDefined();
			expect(Object.keys(tools ?? {})).toHaveLength(1);
		});
	});
});
