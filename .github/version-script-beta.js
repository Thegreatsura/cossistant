import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const packages = [
	{
		name: "@cossistant/react",
		file: "packages/react/package.json",
		dependencies: [],
	},
	{
		name: "@cossistant/next",
		file: "packages/next/package.json",
		dependencies: ["@cossistant/react"],
	},
];

const getShortSha = () => {
	try {
		return (
			process.env.GITHUB_SHA?.slice(0, 7) ??
			execSync("git rev-parse --short HEAD").toString().trim()
		);
	} catch (error) {
		console.error("Unable to determine git SHA");
		throw error;
	}
};

const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

const main = async () => {
	const sha = getShortSha();
	const version = `0.0.0-beta.${sha}`;

	console.log(`Setting prerelease version to ${version}`);

	for (const pkg of packages) {
		const pkgPath = path.resolve(pkg.file);
		const raw = await readFile(pkgPath, "utf8");
		const data = JSON.parse(raw);

		data.version = version;

		if (pkg.dependencies.length > 0) {
			for (const depName of pkg.dependencies) {
				if (data.dependencies?.[depName]) {
					data.dependencies[depName] = version;
				}
				if (data.devDependencies?.[depName]) {
					data.devDependencies[depName] = version;
				}
				if (data.peerDependencies?.[depName]) {
					data.peerDependencies[depName] = version;
				}
			}
		}

		await writeFile(pkgPath, formatJson(data));
		console.log(`Updated ${pkgPath}`);
	}

	if (process.env.GITHUB_OUTPUT) {
		await writeFile(process.env.GITHUB_OUTPUT, `version=${version}\n`, {
			encoding: "utf8",
			flag: "a",
		});
	}
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
