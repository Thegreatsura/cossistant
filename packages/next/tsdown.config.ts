import { defineConfig } from "tsdown";

export default defineConfig({
        // we want to preserve the folders structure together with
        // 'use client' directives
        entry: ["src/**/*.{ts,tsx}", "!src/**/*.css"],
        minify: false,
        sourcemap: true,
        clean: true,
        dts: true,
        treeshake: true,
        external: ["@cossistant/react", "next", "react", "react-dom"],
});
