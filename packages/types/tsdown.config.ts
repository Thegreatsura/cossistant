import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/**/*.ts", "!src/**/*.test.ts"],
	clean: true,
	dts: {
		// Resolve and bundle all type dependencies to avoid exposing zod's .d.cts files
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
	// Don't mark anything as external - bundle everything to avoid module resolution issues
	external: [],
});
