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
		// Don't resolve/bundle types - keep @cossistant/* imports external
		// The react package already bundles its types, consumers get types from there
		// Note: MISSING_EXPORT warnings during build are expected and harmless -
		// they occur because the dts bundler can't resolve type-only exports from
		// TypeScript-generated .d.ts files in workspace packages
		resolve: false,
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
	external: [
		"@cossistant/react",
		"@cossistant/core",
		"@cossistant/types",
		"next",
		"react",
		"react-dom",
	],
});
