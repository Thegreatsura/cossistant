import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/**/*.ts",
		"src/**/*.tsx",
		"!src/**/*.test.ts",
		"!src/**/*.test.tsx",
		"!src/**/*.stories.tsx",
		"!src/**/*.css",
	],
	clean: true,
	dts: {
		// Resolve and bundle all type dependencies to avoid exposing third-party .d.cts files
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
	external: ["@cossistant/react", "next", "react", "react-dom"],
});
