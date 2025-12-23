import path from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import fs from "fs-extra";
import type { Commit } from "./git";

function getOpenRouterClient() {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error("OPENROUTER_API_KEY environment variable is required");
	}
	return createOpenRouter({ apiKey });
}

export async function generateChangelog(options: {
	commits: Commit[];
	description: string;
	version: string;
	releaseType: "patch" | "minor" | "major";
}): Promise<string> {
	const templatePath = path.join(import.meta.dir, "../templates/changelog.mdx");
	const template = await fs.readFile(templatePath, "utf-8");

	const commitList = options.commits
		.map((c) => `- ${c.hash}: ${c.subject} (${c.author})`)
		.join("\n");

	const openrouter = getOpenRouterClient();

	const result = await generateText({
		model: openrouter.chat("anthropic/claude-opus-4.1"),
		system: `You are a technical writer creating SHORT changelog entries for Cossistant, a developer SDK to add AI/human powered support to a React or Next.js application.

RULES:
- Be CONCISE. Each bullet point should be 1 short sentence max.
- Focus only on user-facing changes. Skip internal refactors.
- Use the exact template structure provided.
- Only include sections that have actual changes. Omit empty sections entirely.
- The Highlights section is for major features only. Skip it for patch releases with just bug fixes.
- Output valid MDX that can be rendered.`,
		prompt: `Generate a changelog for version ${options.version} (${options.releaseType} release).

User description: ${options.description}

Git commits since last release:
${commitList}

Template structure:
${template}

Requirements:
- Version: "${options.version}"
- Date: "${new Date().toISOString().split("T")[0]}"
- Keep it SHORT and scannable
- One-line summary in the Callout
- Only include sections with actual changes`,
		temperature: 0.5,
	});

	return result.text;
}

export async function refineChangelog(
	currentChangelog: string,
	refinementRequest: string
): Promise<string> {
	const openrouter = getOpenRouterClient();

	const result = await generateText({
		model: openrouter.chat("google/gemini-2.5-flash-preview"),
		system:
			"You are refining a changelog. Keep it SHORT and concise. Maintain the same MDX format.",
		prompt: `Current changelog:
${currentChangelog}

Requested changes: ${refinementRequest}

Apply the changes. Keep it brief and scannable.`,
		temperature: 0.5,
	});

	return result.text;
}
