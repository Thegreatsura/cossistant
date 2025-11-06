import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/**/*.ts", "!src/**/*.test.ts"],
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
	external: ["@cossistant/types", "nanoid", "ulid", "zod"],
});
