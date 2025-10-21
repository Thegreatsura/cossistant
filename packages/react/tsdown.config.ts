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
	dts: true,
	hash: false,
	minify: false,
	sourcemap: true,
	treeshake: true,
	unbundle: true,
	outExtensions: () => ({
		js: ".js",
		dts: ".d.ts",
	}),
	external: [
		"react",
		"react-dom",
		"motion",
		"@cossistant/core",
		"@cossistant/types",
	],
});
