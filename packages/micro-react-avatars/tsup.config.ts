import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.tsx",
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
      js: format === "esm" ? ".mjs" : ".js",
    };
  },
  external: [
    // React ecosystem (peer dependencies)
    "react",
    "react-dom",
    "react/jsx-runtime",
  ],
  esbuildOptions(options) {
    // Ensure proper JSX handling
    options.jsx = "automatic";
  },
});
