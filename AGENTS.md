# Repository Guidelines

## Project Structure & Module Organization
- Turborepo workspaces live under `apps/*` and `packages/*`; `apps/api` exposes the Hono/TRPC backend, while `apps/web` hosts the Next.js dashboard, landing, and docs.
- The embeddable support widget ships as libraries in `packages/react` (prebuilt `<Support />` plus headless primitives) and `packages/next` (Next.js bindings). Shared state, types, and utilities are found in `packages/core`, `packages/types`, and `packages/transactional`.
- Documentation is built with Fumadocs from markdown in `apps/web/content`; assets stay in `docs/`, infra scripts in `infra/`, and CLI tools in `scripts/`. Colocate tests beside sources as `*.test.ts`.

## Build, Test & Development Commands
- `bun install` installs workspace dependencies; stick to Bun (v1.2+) to avoid lockfile churn.
- `bun run dev` (root) bootstraps Docker services and runs `turbo run dev` across apps.
- `bun run build` composes all package builds via Turbo; use `bun run build --filter @cossistant/web` for scoped builds.
- `bun run fix` calls Ultracite/Biome to lint and autofix formatting; rely on it before committing or pushing.
- `bun run lint`, `bun run check-types`, and `bun run docs:links` delegate to Turbo, Biome checks, and Markdown link validation respectively.
- API-specific tooling lives in `apps/api`: `bun run db:migrate`, `bun run db:seed`, and `bun run better-auth:generate-schema`.

## Coding Style & Naming Conventions
- Formatting is enforced by Biome (`biome.jsonc`), inheriting Ultracite presets: tab indentation, double quotes, and trailing commas where valid.
- Prefer descriptive camelCase for functions/variables, PascalCase for React components, and kebab-case for file names except Next.js route conventions.
- Let `bun run fix` resolve style issues automatically; avoid manual edits to generated `dist/` artifacts.

## Testing Guidelines
- Use Bun’s test runner (`bun test`) colocated with source; snapshots and mocks should live alongside the test file.
- Execute `bun run test` within a specific package or `turbo run test --filter @cossistant/react` for targeted suites; `bun run test:coverage` surfaces coverage when investigating regressions.
- Name specs with the `*.test.ts` suffix and arrange describe blocks by feature (`describe("presence service", ...)`) to keep reports readable.

## Commit & Pull Request Guidelines
- The repo follows Conventional Commits (`feat:`, `fix:`, `docs:`) as seen in recent history; use `bun run changeset` when shipping public package updates.
- Each PR should summarize scope, link issues, list env/config changes, and add dashboard/widget screenshots when UI shifts.
- Ensure lint/tests pass locally before requesting review; attach commands run (e.g., `bun run lint`, `bun run test`) in the PR description.
