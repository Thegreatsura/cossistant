# Repository Guidelines

## Project Structure & Module Organization

This Bun + Turbo monorepo separates runtime apps from shared packages. `apps/web` hosts the Next.js App Router UI (`src/app`, reusable widgets in `src/components`, helpers in `src/lib`, assets in `public/`). `apps/api` contains the Bun/Hono backend with Drizzle schemas (`src/db`), TRPC routers (`src/trpc`), and WebSocket handlers (`src/ws`), each with colocated `*.test.ts`. Shared contracts and utilities live under `packages/*` (e.g. `core`, `types`, `transactional`). External integrations sit in `datasources/`, and deployment or container plumbing is in `infra/` plus the root `docker-compose.yml`.

## Build, Test, and Development Commands

Install dependencies via `bun install --workspaces`. Start everything with `bun run dev`, which brings up Docker sidecars and executes `turbo run dev`; filter targets using `bunx turbo run dev --filter=@cossistant/web` (or `@cossistant/api`). Build production bundles with `bun run build`. Run linting through `bun run lint`, and format docs or TypeScript with `bun run format` or the workspace-level `bun run format`. For single-app loops, `cd apps/api && bun run dev` or `cd apps/web && bun run dev`.

## Coding Style & Naming Conventions

Biome (`biome.jsonc`) is authoritative: tabs for indentation, double quotes, Ultracite presets. Keep code in TypeScript, prefer explicit return types on exported APIs, and surface shared DTOs in `packages/types`. React components and layouts use snake case filenames, hooks start with `use` and live in `src/hooks`, utilities stay camelCase. Lean on shared packages for cross-cutting logic and let Biome/Prettier enforce formatting instead of manual tweaks.

## Testing Guidelines

Bun’s test runner is standard. Execute the suite with `bunx turbo run test`; scope runs via `--filter=@cossistant/api` or drop into a workspace and run `bun test`. Use `bun test --coverage` inside the API when coverage matters. Co-locate specs as `*.test.ts`, add integration paths for TRPC and WebSocket handlers, and reuse mocks from `apps/api/src/utils`. Database updates require matching migrations and seeds exercised with `bun run db:seed`.

## Commit & PR Guidelines

Commits follow Conventional Commit syntax (`feat:`, `fix:`, optional scopes like `feat(api): ...`). Keep them focused and ensure `bun run lint` plus `bunx turbo run test` succeed before pushing. PRs should summarize intent, link GitHub issues, and include screenshots or brief clips for UI changes. Document new environment variables or migrations in the description, update config samples as needed, and note any manual QA before requesting review.
