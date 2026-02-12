# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cossistant is the **"shadcn of support"** - an open-source chat support widget for React. It provides both a ready-to-use `<Support />` component and headless primitives for complete customization, with real-time messaging and AI + human agent support.

## Monorepo Structure

### Apps

| App | Description |
|-----|-------------|
| `apps/api` | Hono/tRPC backend with Drizzle ORM, Better Auth, WebSocket handlers, and AI agent logic |
| `apps/web` | Next.js app: dashboard, landing page, docs (Fumadocs), changelog, blog |
| `apps/workers` | BullMQ workers for message notifications, AI agent responses, and web crawling |
| `apps/mobile` | React Native mobile app |
| `apps/widget-next-test` | Test environment for widget development |

### Packages

| Package | Description |
|---------|-------------|
| `packages/react` | **Main SDK** - `<Support />` component + headless primitives (`@cossistant/react`) |
| `packages/next` | Next.js wrapper - re-exports `@cossistant/react` with `"use client"` directive |
| `packages/core` | Shared state, API client, route registry, utilities |
| `packages/types` | Shared TypeScript types |
| `packages/jobs` | BullMQ job definitions and queue names |
| `packages/redis` | Redis client utilities |
| `packages/transactional` | Email templates (React Email) |
| `packages/location` | Geolocation utilities |

## React SDK Architecture (`packages/react`)

The SDK offers two usage modes:

### 1. Default `<Support />` Component
Zero-config, fully-featured widget:
```tsx
import { Support } from "@cossistant/next";
<Support />
```

Compound components for customization:
- `Support.Root` - Root container with providers
- `Support.Trigger` - Toggle button
- `Support.Content` - Floating panel
- `Support.Router` - Page navigation
- `Support.Page` - Custom page registration

### 2. Headless Primitives
Complete control, shadcn-style - unstyled, composable, Tailwind-ready:
```tsx
import { Primitives } from "@cossistant/react";
<Primitives.Trigger>...</Primitives.Trigger>
<Primitives.Window>...</Primitives.Window>
```

Available primitives: `Trigger`, `Window`, `ConversationTimeline`, `TimelineItem`, `TimelineItemGroup`, `Avatar`, `MultimodalInput`, `Button`, `TypingIndicator`, `Config`, etc.

### Key Hooks
- `useSupportConfig()` - Widget open/close state
- `useSupportNavigation()` - Page navigation (navigate, goBack)
- `useSupport()` - Full context (visitor, website, client)
- `useConversation()`, `useConversations()`, `useSendMessage()`, etc.

## Next.js Package (`packages/next`)

Re-exports everything from `@cossistant/react` with Next.js compatibility:
- Adds `"use client"` directive for RSC support
- Same API surface as the React package
- Peer dependency: Next.js 13.5.2+, 14, 15, or 16

## Workers (`apps/workers`)

Background job processing with BullMQ + Redis:

| Queue | Purpose |
|-------|---------|
| `message-notification` | Push notifications, emails for new messages |
| `ai-agent` | AI agent response generation and escalation |
| `web-crawl` | Web scraping for knowledge base ingestion |

## Analytics (`tinybird/`)

Real-time analytics powered by Tinybird (ClickHouse):

### Datasources
| Datasource | Contents | Retention |
|------------|----------|-----------|
| `visitor_events` | `seen`, `page_view` events with geo data | 30 days (all tiers) |
| `conversation_metrics` | Conversation lifecycle events | Indefinite for paid, 21d for free (query-time enforcement) |

### Endpoints (Pipes)
- `inbox_analytics` - Dashboard metrics (response time, resolution time, AI rate)
- `unique_visitors` - Unique visitor counts by date range
- `active_visitors` - Real-time active visitors with geolocation
- `visitor_locations` - Geo aggregation for globe visualization

### Local Development
Tinybird Local (`tb dev`) runs automatically on port 7181 when you start `bun dev`. The Tinybird schema is defined in `.datasource` and `.pipe` files in the `tinybird/` directory.

## Documentation Sync (Critical)

Documentation lives in `apps/web/content/docs/`. When updating `packages/react`:

1. **Verify docs are accurate** in `apps/web/content/docs/support-component/`:
   - `index.mdx` - Basic usage
   - `primitives.mdx` - Headless components
   - `hooks.mdx` - React hooks
   - `events.mdx` - Event callbacks
   - `customization.mdx` - Advanced patterns
   - `theme.mdx`, `text.mdx`, `routing.mdx`

2. **Update if APIs changed** - Props, hook signatures, component structure

## Landing Page Demo Sync (Critical)

The landing page uses animated demo UIs that must mirror the real product:

| Demo Component | Mirrors |
|----------------|---------|
| `apps/web/src/components/landing/fake-dashboard/` | Real dashboard UI |
| `apps/web/src/components/landing/fake-support-widget/` | Real support widget UI |

When updating the dashboard or widget:
1. Update the corresponding fake component to match the new UI
2. Reuse components between fake and real implementations where possible
3. Keep visual parity so demos accurately represent the product

## Build & Development

```bash
bun install                    # Install dependencies (Bun v1.2+)
bun run dev                    # Docker + all apps in dev mode
bun run build                  # Build all via Turbo
bun run fix                    # Lint/format with Ultracite/Biome
bun run check-types            # TypeScript type checking (all packages)
```

**API commands (from `apps/api`):**
```bash
bun run db:migrate             # Run migrations
bun run db:seed                # Seed database
bun run db:studio              # Drizzle Studio
```

**Scoped operations:**
```bash
bun run build --filter @cossistant/react...  # Build with dependencies
turbo run test --filter @cossistant/react    # Run specific tests
turbo run check-types --filter @cossistant/api  # Type check specific package
```

## Type Checking

Run `bun run check-types` to verify TypeScript types across the entire monorepo. This command:
- Uses Turbo for parallel execution across all packages
- Caches results for faster subsequent runs
- Builds dependencies first (configured via `dependsOn: ["^build"]` in turbo.json)

**Always run before committing** to catch type errors early. The check covers all apps and packages including `apps/api`, `apps/web`, `apps/workers`, and all shared packages.

## Code Style

- Biome formatting: tabs, double quotes, trailing commas
- Run `bun run fix` before committing
- Use `const` objects with `as const` instead of enums
- Naming: kebab-case files, camelCase functions, PascalCase components

## Testing

```bash
bun test                       # Run tests in current package
bun run test:watch             # Watch mode
bun run test:coverage          # With coverage
```

Test files: `*.test.ts` colocated with source.

## Commit Conventions

Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
Use `bun run changeset` for public package releases.

## Environment Setup

Copy `.env.example` to `.env`:
- **Database**: PostgreSQL with pgvector
- **Auth**: Better Auth (Google/GitHub OAuth)
- **Services**: Redis, Tinybird Local, Resend (email), QStash (queues), S3 (storage)
- **AI**: OpenRouter API

Start all services: `bun dev`

**Tinybird Setup**: Tinybird Local runs on port 7181. Schema is in `tinybird/` and auto-loads when you run `bun dev`.
