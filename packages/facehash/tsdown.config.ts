import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/next/index.ts"],
	clean: true,
	dts: {
		resolve: true,
	},
	hash: false,
	minify: false,
	sourcemap: true,
	treeshake: true,
	outExtensions: () => ({
		js: ".js",
		dts: ".d.ts",
	}),
	external: ["react", "react-dom", "next", "next/og", "next/server"],
});
