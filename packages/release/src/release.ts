import path from "node:path";
import { execa } from "execa";
import fs from "fs-extra";
import ora from "ora";

export async function runRelease(
	releaseType: "patch" | "minor" | "major",
	description: string
): Promise<void> {
	const spinner = ora();

	// Create changeset
	spinner.start("Creating changeset...");
	await createChangeset(releaseType, description);
	spinner.succeed("Changeset created");

	// Version packages
	spinner.start("Versioning packages...");
	await execa("bun", ["run", "changeset:version"], { stdio: "pipe" });
	spinner.succeed("Packages versioned");

	// Commit version changes
	spinner.start("Committing version changes...");
	await execa("git", ["add", "."]);
	await execa("git", ["commit", "-m", "chore(release): version packages"]);
	spinner.succeed("Changes committed");

	// Build and publish
	spinner.start("Building and publishing to npm...");
	await execa("bun", ["run", "changeset:publish"], { stdio: "pipe" });
	spinner.succeed("Published to npm");

	// Push commits and tags
	spinner.start("Pushing to remote...");
	await execa("git", ["push"]);
	await execa("git", ["push", "--tags"]);
	spinner.succeed("Pushed to remote");
}

async function createChangeset(
	releaseType: "patch" | "minor" | "major",
	description: string
): Promise<void> {
	const changesetContent = `---
"@cossistant/core": ${releaseType}
"@cossistant/react": ${releaseType}
"@cossistant/next": ${releaseType}
"@cossistant/types": ${releaseType}
---

${description}
`;

	const filename = path.join(
		process.cwd(),
		".changeset",
		`${Date.now()}-release.md`
	);
	await fs.outputFile(filename, changesetContent);
}
