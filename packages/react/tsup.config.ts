import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"support/index": "src/support/index.tsx",
		"primitive/index": "src/primitive/index.ts",
	},
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	outDir: "dist",
	target: "es2020",
	// Use browser platform since this is a React component library
	platform: "browser",
	splitting: false,
	sourcemap: true,
	minify: false, // Don't minify to allow better debugging for consumers
	treeshake: true,
	outExtension({ format }) {
		return {
			js: format === "esm" ? ".mjs" : ".cjs",
		};
	},
	external: [
		// React ecosystem (peer dependencies)
		"react",
		"react-dom",
		"react/jsx-runtime",

		// Peer dependencies
		"@tanstack/react-query",
		"motion",
		"motion/*",
		"tailwindcss",

		// Internal workspace packages that should be bundled
		// Remove "@cossistant/*" to bundle core and types
		"@cossistant/core",
		"@cossistant/types",

		// Regular dependencies that should stay external
		"react-use-websocket",
		"react-markdown",
		"zustand",
		"zustand/middleware",
		"nanoid",
		"ulid",
		"tailwind-merge",
	],
	esbuildOptions(options) {
		// Ensure proper JSX handling
		options.jsx = "automatic";
	},
});
