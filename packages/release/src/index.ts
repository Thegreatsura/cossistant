#!/usr/bin/env bun
import path from "node:path";
import { config } from "@dotenvx/dotenvx";
import { Command } from "commander";

// Load .env from the release package directory
config({ path: path.join(import.meta.dir, "../.env"), quiet: true });

import kleur from "kleur";
import ora from "ora";
import prompts from "prompts";
import {
	detectImportantFeatures,
	type FeatureDetail,
	type FeatureQuestion,
	generateChangelog,
	refineChangelog,
} from "./ai";
import { getNextVersion, saveChangelog } from "./changelog";
import { getCommitsSinceLastRelease, getLastReleaseTag } from "./git";
import { runRelease } from "./release";

const program = new Command()
	.name("cossistant-release")
	.description("AI-powered release CLI for Cossistant packages")
	.version("0.0.1");

program
	.command("create")
	.description("Create a new release with AI-generated changelog")
	.action(async () => {
		console.log(kleur.cyan().bold("\n  Cossistant Release CLI\n"));

		// Step 1: Select release type
		const { releaseType } = await prompts({
			type: "select",
			name: "releaseType",
			message: "What type of release is this?",
			choices: [
				{ title: "patch", description: "Bug fixes (0.0.x)", value: "patch" },
				{ title: "minor", description: "New features (0.x.0)", value: "minor" },
				{
					title: "major",
					description: "Breaking changes (x.0.0)",
					value: "major",
				},
			],
		});

		if (!releaseType) {
			process.exit(0);
		}

		// Step 2: Get description
		const { description } = await prompts({
			type: "text",
			name: "description",
			message: "Describe the main changes in this release:",
			validate: (value) =>
				value.length > 10 || "Please provide a more detailed description",
		});

		if (!description) {
			process.exit(0);
		}

		// Step 3: Fetch git commits
		const spinner = ora("Fetching git commits...").start();
		const lastTag = await getLastReleaseTag();
		const commits = await getCommitsSinceLastRelease(lastTag);
		spinner.succeed(
			`Found ${commits.length} commits since ${lastTag || "beginning"}`
		);

		// Step 4: AI Feature Detection - Ask questions to gather more details
		spinner.start("Analyzing release for key features...");
		const questions = await detectImportantFeatures({
			commits,
			description,
			releaseType,
		});
		spinner.succeed(
			questions.length > 0
				? `Identified ${questions.length} key feature(s) to document`
				: "No additional details needed"
		);

		const featureDetails: FeatureDetail[] = [];

		if (questions.length > 0) {
			console.log(
				kleur.dim(
					"\n  The AI identified key features that could use more detail.\n"
				)
			);

			for (const question of questions) {
				const importanceLabel =
					question.importance === "high"
						? kleur.yellow("[Important]")
						: kleur.dim("[Optional]");

				console.log(`\n  ${importanceLabel} ${kleur.bold(question.feature)}\n`);

				const { action } = await prompts({
					type: "select",
					name: "action",
					message: question.question,
					choices: [
						{ title: "Answer this question", value: "answer" },
						{ title: "Skip this question", value: "skip" },
						{ title: "Skip all remaining questions", value: "skip_all" },
					],
				});

				if (action === "skip_all" || !action) {
					break;
				}

				if (action === "answer") {
					const { answer } = await prompts({
						type: "text",
						name: "answer",
						message: "Your answer:",
						validate: (value) =>
							value.length > 0 || "Please provide an answer or skip",
					});

					if (answer) {
						featureDetails.push({
							id: question.id,
							feature: question.feature,
							question: question.question,
							answer,
						});
					}
				}
			}

			if (featureDetails.length > 0) {
				console.log(
					kleur.green(
						`\n  Collected ${featureDetails.length} detail(s) for the changelog.\n`
					)
				);
			}
		}

		// Step 5: Generate changelog with AI
		spinner.start("Generating changelog with AI...");
		const nextVersion = getNextVersion(lastTag, releaseType);
		let changelog = await generateChangelog({
			commits,
			description,
			version: nextVersion,
			releaseType,
			featureDetails: featureDetails.length > 0 ? featureDetails : undefined,
		});
		spinner.succeed("Changelog generated");

		// Step 6: Refinement loop
		while (true) {
			console.log(kleur.dim(`\n${"─".repeat(60)}\n`));
			console.log(changelog);
			console.log(kleur.dim(`\n${"─".repeat(60)}\n`));

			const { action } = await prompts({
				type: "select",
				name: "action",
				message: "What would you like to do?",
				choices: [
					{ title: "Approve and release", value: "approve" },
					{ title: "Request changes from AI", value: "refine" },
					{ title: "Cancel", value: "cancel" },
				],
			});

			if (action === "cancel" || !action) {
				process.exit(0);
			}
			if (action === "approve") {
				break;
			}

			const { refinement } = await prompts({
				type: "text",
				name: "refinement",
				message: "What changes would you like?",
			});

			if (!refinement) {
				continue;
			}

			spinner.start("Refining changelog...");
			changelog = await refineChangelog(changelog, refinement);
			spinner.succeed("Changelog refined");
		}

		// Step 7: Save and release
		const savedPath = await saveChangelog(changelog, nextVersion);
		console.log(kleur.green(`\nChangelog saved to: ${savedPath}`));

		await runRelease(releaseType, description);

		console.log(kleur.green().bold("\n  Release completed successfully!\n"));
	});

program.parse();
