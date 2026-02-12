import type {
	GetCapabilitiesStudioResponse,
	UpdateBehaviorSettingsRequest,
} from "@cossistant/types";
import {
	parseSkillFileContent,
	serializeSkillFileContent,
	stripSkillMarkdownExtension,
} from "@cossistant/types";

type BehaviorSettingKey = NonNullable<
	GetCapabilitiesStudioResponse["tools"][number]["behaviorSettingKey"]
>;

export function buildBehaviorSettingsPatch(
	key: BehaviorSettingKey,
	value: boolean
): UpdateBehaviorSettingsRequest["settings"] {
	switch (key) {
		case "canResolve":
			return { canResolve: value };
		case "canMarkSpam":
			return { canMarkSpam: value };
		case "canSetPriority":
			return { canSetPriority: value };
		case "canEscalate":
			return { canEscalate: value };
		case "autoGenerateTitle":
			return { autoGenerateTitle: value };
		case "autoAnalyzeSentiment":
			return { autoAnalyzeSentiment: value };
		default:
			return {};
	}
}

export function normalizeSkillFileName(input: string): string {
	const value = input.trim().toLowerCase().replace(/\s+/g, "-");
	if (!value) {
		return "";
	}
	return value.endsWith(".md") ? value : `${value}.md`;
}

export function normalizeSkillFrontmatterName(input: string): string {
	return stripSkillMarkdownExtension(input).trim();
}

export function toCanonicalSkillFileNameFromFrontmatterName(
	input: string
): string {
	return normalizeSkillFileName(normalizeSkillFrontmatterName(input));
}

export function parseSkillEditorContent(input: {
	content: string;
	canonicalFileName: string;
	fallbackDescription?: string;
}) {
	return parseSkillFileContent(input);
}

export function serializeSkillEditorContent(input: {
	name: string;
	description: string;
	body: string;
}) {
	return serializeSkillFileContent({
		name: normalizeSkillFrontmatterName(input.name),
		description: input.description,
		body: input.body,
	});
}
