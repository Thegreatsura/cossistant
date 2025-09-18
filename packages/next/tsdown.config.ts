import { defineConfig } from "tsup";

export default defineConfig({
  // we want to preserve the folders structure together with
  // 'use client' directives
  entry: ["src/**/*.{ts,tsx}"],
  minify: false,
  sourcemap: true,
  clean: true,
  dts: true,
  treeshake: true,
  external: ["@cossistant/react"],
});
