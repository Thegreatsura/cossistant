import { describe, expect, it } from "bun:test";
import {
	buildBehaviorSettingsPatch,
	normalizeSkillFileName,
	normalizeSkillFrontmatterName,
	parseSkillEditorContent,
	serializeSkillEditorContent,
	toCanonicalSkillFileNameFromFrontmatterName,
} from "./tools-studio-utils";

describe("tools-studio-utils", () => {
	it("maps each toggle key to the expected behavior setting patch", () => {
		expect(buildBehaviorSettingsPatch("canResolve", true)).toEqual({
			canResolve: true,
		});
		expect(buildBehaviorSettingsPatch("canMarkSpam", false)).toEqual({
			canMarkSpam: false,
		});
		expect(buildBehaviorSettingsPatch("canSetPriority", true)).toEqual({
			canSetPriority: true,
		});
		expect(buildBehaviorSettingsPatch("canEscalate", false)).toEqual({
			canEscalate: false,
		});
		expect(buildBehaviorSettingsPatch("autoGenerateTitle", true)).toEqual({
			autoGenerateTitle: true,
		});
		expect(buildBehaviorSettingsPatch("autoAnalyzeSentiment", false)).toEqual({
			autoAnalyzeSentiment: false,
		});
	});

	it("normalizes skill names to kebab-case markdown filenames", () => {
		expect(normalizeSkillFileName("Refund Playbook")).toBe(
			"refund-playbook.md"
		);
		expect(normalizeSkillFileName("custom-skill.md")).toBe("custom-skill.md");
		expect(normalizeSkillFileName("  ")).toBe("");
	});

	it("normalizes frontmatter names without markdown extension", () => {
		expect(normalizeSkillFrontmatterName("refund-playbook.md")).toBe(
			"refund-playbook"
		);
		expect(normalizeSkillFrontmatterName("  refund-playbook  ")).toBe(
			"refund-playbook"
		);
	});

	it("maps frontmatter names to canonical skill document names", () => {
		expect(toCanonicalSkillFileNameFromFrontmatterName("refund-playbook")).toBe(
			"refund-playbook.md"
		);
		expect(
			toCanonicalSkillFileNameFromFrontmatterName("Refund Playbook.md")
		).toBe("refund-playbook.md");
	});

	it("round-trips frontmatter editor fields into markdown content", () => {
		const content = serializeSkillEditorContent({
			name: "refund-playbook",
			description: "Handle refund policy questions.",
			body: "## Refunds\n\nAsk for the order id first.",
		});

		const parsed = parseSkillEditorContent({
			content,
			canonicalFileName: "refund-playbook.md",
		});

		expect(parsed.hasFrontmatter).toBe(true);
		expect(parsed.name).toBe("refund-playbook");
		expect(parsed.description).toBe("Handle refund policy questions.");
		expect(parsed.body).toContain("## Refunds");
	});

	it("auto-backfills legacy skill content without frontmatter", () => {
		const parsed = parseSkillEditorContent({
			content: "## Escalation Playbook\n\nEscalate when policy is unclear.",
			canonicalFileName: "escalation-playbook.md",
		});

		expect(parsed.hasFrontmatter).toBe(false);
		expect(parsed.name).toBe("escalation-playbook");
		expect(parsed.description).toBe("Escalation Playbook");
		expect(parsed.body).toContain("Escalate when policy is unclear.");
	});
});
