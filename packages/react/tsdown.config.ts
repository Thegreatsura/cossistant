import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		support: "src/support/index.tsx",
		primitives: "src/primitives/index.ts",
		hooks: "src/hooks/index.ts",
		utils: "src/utils/index.ts",
	},
	platform: "browser",
	splitting: false,
	sourcemap: true,
	minify: false,
	treeshake: true,
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
});
