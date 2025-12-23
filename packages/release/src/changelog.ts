import path from "node:path";
import fs from "fs-extra";

const VERSION_REGEX = /@(\d+)\.(\d+)\.(\d+)$/;

export function getNextVersion(
	lastTag: string | null,
	releaseType: "patch" | "minor" | "major"
): string {
	if (!lastTag) {
		return releaseType === "major"
			? "1.0.0"
			: releaseType === "minor"
				? "0.1.0"
				: "0.0.1";
	}

	// Extract version from tag like "@cossistant/react@0.0.26"
	const match = lastTag.match(VERSION_REGEX);
	if (!match) {
		return "0.0.1";
	}

	const [, majorStr, minorStr, patchStr] = match;
	const major = Number(majorStr);
	const minor = Number(minorStr);
	const patch = Number(patchStr);

	switch (releaseType) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		default:
			return `${major}.${minor}.${patch + 1}`;
	}
}

export async function saveChangelog(
	content: string,
	version: string
): Promise<string> {
	const today = new Date().toISOString().split("T")[0];
	const filename = `${today}-v${version}.mdx`;
	const filepath = path.join(
		process.cwd(),
		"apps/web/content/changelog",
		filename
	);

	await fs.outputFile(filepath, content);
	return filepath;
}
