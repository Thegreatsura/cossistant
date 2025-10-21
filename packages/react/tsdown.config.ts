import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/**/*.{ts,tsx}", "!src/**/*.css"],
	minify: false,
	sourcemap: true,
	clean: true,
	dts: true,
	treeshake: true,
	external: [
		"react",
		"react-dom",
		"motion",
		"@cossistant/core",
		"@cossistant/types",
	],
});
