import {
	DEFAULT_SKILL_SELECTION_LIMIT,
	extractSkillReferencesFromCapabilities,
} from "@api/ai-agent/prompts/documents";
import type { RoleAwareMessage } from "../context/conversation";
import type { ResponseMode } from "../pipeline/2-decision";
import type { ResolvedSkillPromptDocument } from "./resolver";

const STOP_WORDS = new Set<string>([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"but",
	"by",
	"for",
	"from",
	"how",
	"i",
	"if",
	"in",
	"is",
	"it",
	"of",
	"on",
	"or",
	"that",
	"the",
	"to",
	"we",
	"you",
	"your",
]);

export type SelectedSkillPromptDocument = ResolvedSkillPromptDocument & {
	relevanceScore: number;
};

type SelectSkillsInput = {
	enabledSkills: ResolvedSkillPromptDocument[];
	conversationHistory: RoleAwareMessage[];
	mode: ResponseMode;
	humanCommand: string | null;
	capabilitiesContent: string;
	maxSkills?: number;
};

function tokenize(text: string): Set<string> {
	if (!text.trim()) {
		return new Set();
	}

	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 3)
		.filter((token) => !STOP_WORDS.has(token));

	return new Set(tokens);
}

function getRecentContext(messages: RoleAwareMessage[]): string {
	if (messages.length === 0) {
		return "";
	}

	const recent = messages.slice(-8);
	return recent.map((message) => message.content).join("\n");
}

function scoreSkill(
	skill: ResolvedSkillPromptDocument,
	contextTokens: Set<string>,
	referencedSkillNames: Set<string>
): number {
	if (contextTokens.size === 0 && !referencedSkillNames.has(skill.name)) {
		return 0;
	}

	const skillText = `${skill.name} ${skill.content.slice(0, 2500)}`;
	const skillTokens = tokenize(skillText);

	let overlapCount = 0;
	for (const token of contextTokens) {
		if (skillTokens.has(token)) {
			overlapCount += 1;
		}
	}

	const referenceBoost = referencedSkillNames.has(skill.name) ? 3 : 0;
	const priorityBoost = Math.max(-100, Math.min(100, skill.priority)) / 100;

	return overlapCount + referenceBoost + priorityBoost;
}

export function selectRelevantSkills(
	input: SelectSkillsInput
): SelectedSkillPromptDocument[] {
	const {
		enabledSkills,
		conversationHistory,
		mode,
		humanCommand,
		capabilitiesContent,
		maxSkills = DEFAULT_SKILL_SELECTION_LIMIT,
	} = input;

	if (enabledSkills.length === 0 || maxSkills <= 0) {
		return [];
	}

	const referencedSkillNames = new Set<string>(
		extractSkillReferencesFromCapabilities(capabilitiesContent)
	);

	const contextText = [
		mode.replaceAll("_", " "),
		humanCommand ?? "",
		getRecentContext(conversationHistory),
	]
		.filter(Boolean)
		.join("\n");
	const contextTokens = tokenize(contextText);

	const ranked = enabledSkills
		.map((skill) => ({
			...skill,
			relevanceScore: scoreSkill(skill, contextTokens, referencedSkillNames),
		}))
		.filter((skill) => skill.relevanceScore > 0)
		.sort((a, b) => {
			if (b.relevanceScore !== a.relevanceScore) {
				return b.relevanceScore - a.relevanceScore;
			}
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}
			return a.name.localeCompare(b.name);
		});

	if (ranked.length > 0) {
		return ranked.slice(0, maxSkills);
	}

	// If semantic overlap fails entirely, include explicitly referenced skills only.
	const referenced = enabledSkills
		.filter((skill) => referencedSkillNames.has(skill.name))
		.sort((a, b) => {
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}
			return a.name.localeCompare(b.name);
		})
		.slice(0, maxSkills)
		.map((skill) => ({ ...skill, relevanceScore: 0 }));

	return referenced;
}
