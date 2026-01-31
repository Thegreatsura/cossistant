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
- `bun run check-types` runs TypeScript type checking across all packages via Turbo (builds dependencies first, caches results).
- `bun run lint` and `bun run docs:links` delegate to Biome checks and Markdown link validation respectively.
- API-specific tooling lives in `apps/api`: `bun run db:migrate`, `bun run db:seed`, and `bun run better-auth:generate-schema`.

## Type Checking
- **Command**: `bun run check-types` - Runs `tsc --noEmit` across all packages in parallel via Turbo.
- **Scoped check**: `turbo run check-types --filter @cossistant/api` - Type check a specific package.
- **Pre-commit**: Always run `bun run check-types` before committing to catch type errors early.
- **Dependencies**: The `check-types` task depends on `^build`, meaning it builds dependencies first before type checking.

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

## Support Widget Synchronization
- **Critical**: Whenever the support widget (`packages/react/src/support`) is updated, both `fake-dashboard` and `fake-support-widget` in `apps/web/src/components/landing/` must be kept in sync.
- The fake versions mimic the real widget for landing page animations and demos. Changes to the real widget structure, props, or APIs must be reflected in both fake implementations.
- What needs synchronization:
  - Component structure and layout changes (e.g., HomePage, ConversationPage)
  - New props or API interfaces (e.g., hooks like `useHomePage`, `useConversationPage`)
  - Navigation/routing changes (e.g., new pages, page transitions)
  - Hook interfaces and return types (e.g., `useSupportNavigation`)
  - UI patterns and animation behaviors
- Both fake implementations use separate animation stores (`landing-animation-store` for fake-dashboard, `widget-animation-store` for fake-support-widget) to prevent interference between animations.

## RAG System Architecture
- The RAG (Retrieval-Augmented Generation) system enables AI agents to retrieve relevant context from knowledge bases and visitor/contact memories.
- **Components**:
  - `apps/rag/` - Python FastAPI service using LlamaIndex for document chunking, deployed via `Dockerfile.rag`
  - `apps/api/src/db/schema/chunk.ts` - Drizzle schema for storing chunks with pgvector embeddings
  - `apps/api/src/lib/embedding-client.ts` - OpenRouter embedding client (TypeScript)
  - `apps/api/src/utils/vector-search.ts` - Vector similarity search utilities
- **Data Flow**: Knowledge entries are chunked by the RAG service, embedded via OpenRouter (OpenAI's text-embedding-3-small), and stored in PostgreSQL with pgvector for fast similarity search.
- **Data Isolation**: All chunks are scoped by `websiteId` (required field) to ensure strict data isolation between websites.
- **Source Types**: Chunks can be `knowledge` (from knowledge base), `visitor_memory`, or `contact_memory`.
- See `docs/rag.md` for detailed architecture and usage documentation.
