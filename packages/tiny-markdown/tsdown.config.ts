import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/**/*.ts",
		"src/**/*.tsx",
		"!src/**/*.test.ts",
		"!src/**/*.test.tsx",
	],
	clean: true,
	dts: {
		resolve: true,
	},
	hash: false,
	minify: false,
	sourcemap: true,
	treeshake: true,
	unbundle: true,
	outExtensions: () => ({
		js: ".js",
		dts: ".d.ts",
	}),
	external: ["react", "react-dom"],
});
