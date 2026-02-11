# Findings: Analytics Migration to Tinybird

## Current System Architecture

### Inbox Analytics (`apps/web/src/components/inbox-analytics/`)
- **5 metrics**: Median Response Time, Median Resolution Time, % Handled by AI, Satisfaction Index, Unique Visitors
- **Satisfaction Index** = weighted composite: ratings (40%) + sentiment (25%) + response_time (20%) + resolution_rate (15%)
- **Data hook**: `useInboxAnalytics` -> tRPC `conversation.getInboxAnalytics`
- **Backend**: 7 parallel PostgreSQL queries with `percentile_cont`, `EXTRACT(EPOCH)`, distinct counts
- **Currently hardcoded** to `websiteSlug="cossistant"` only
- **Stale time**: 5 min, refetch: 5 min

### Online Presence (`apps/api/src/services/presence.ts`)
- Redis sorted sets + hash profiles
- Windows: online=10min, away=30min, TTL=1hr
- Stores: id, status, lastSeenAt, name, email, image, city/region/country, lat/lng, contactId
- tRPC: `visitor.listOnline` (polls every 15s, stale 5s)
- **Functions**: `markVisitorPresence()`, `markUserPresence()`, `listOnlineVisitors()`

### Visitor Schema (PostgreSQL)
- 30+ fields: browser/device (10), location (7 incl lat/lng), preferences (3), relationships (4), metadata (6)
- Location from edge headers: Cloudflare `cf-ip*`, Vercel `x-vercel-ip-*`
- Existing `packages/location` handles geo resolution

### Feedback Table
- Rating (1-5), comment, trigger, source
- Used by analytics for satisfaction index (40% weight)

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/inbox-analytics/` | Frontend analytics display |
| `apps/web/src/data/use-inbox-analytics.tsx` | React hook for analytics |
| `apps/api/src/db/queries/inbox-analytics.ts` | 7 parallel PG queries |
| `apps/api/src/trpc/routers/conversation.ts` L113-179 | tRPC analytics endpoint |
| `apps/api/src/services/presence.ts` | Redis presence tracking |
| `apps/api/src/trpc/routers/visitor.ts` L19-44 | tRPC online visitors |
| `apps/web/src/contexts/visitor-presence.tsx` | Frontend presence context |
| `apps/api/src/db/schema/website.ts` L199-283 | Visitor DB schema |
| `apps/api/src/rest/routers/visitor.ts` | Visitor REST endpoints |
| `packages/types/src/trpc/conversation.ts` | Analytics type schemas |
| `packages/types/src/trpc/visitor.ts` | Presence type schemas |

## Tinybird Research

### Cost-Effective Approach
- **Ingestion is FREE** (Events API doesn't consume vCPU)
- **Queries cost**: Free plan = 1,000/day, $49 Developer = unlimited
- **Keep cheap**: proper sorting keys, LowCardinality types, consolidated endpoints, caching
- **TTL**: `ENGINE_TTL` auto-deletes old rows. Set to max tier (90d), enforce per-tier at query time.

### Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ingestion | Events API via server-side proxy | APPEND tokens can't be exposed client-side |
| Client-side | No direct ingestion | Security: no write tokens in browser |
| Retention | Single datasource, TTL=90d | Simple; filter to 21d at query time for free tier |
| Geo resolution | In Hono API, pre-resolved | Already have `packages/location`; ClickHouse GeoIP is complex |
| Live presence | Keep Redis/WS | Tinybird isn't sub-second; use TB for "active in last 5min" aggregate |
| Frontend reads | tRPC proxy initially | Simpler; JWT direct access later for perf |
| Materialized views | Start without | Add when queries are slow (>5s p95) |
| Schema | Flat, typed, LowCardinality | Avoid JSON blobs; cheap queries |

### What Moves to Tinybird vs What Stays
| Data | Destination | Retention | Reason |
|------|-------------|-----------|--------|
| Visitor "seen" events | Tinybird `visitor_events` | 30d (all tiers) | High volume, operational |
| Page views | Tinybird `visitor_events` | 30d (all tiers) | High volume, operational |
| Conversation lifecycle | Tinybird `conversation_metrics` | Indefinite paid / 21d free | Business KPIs |
| Live presence (online/away) | Redis (stays) | TTL 1hr | Sub-second requirement |
| Visitor profiles | PostgreSQL (stays) | Indefinite | Relational, low-write |
| `lastSeenAt` | PostgreSQL visitor table (stays) | Indefinite | Persistent trace post-purge |
| Feedback/ratings | PostgreSQL (stays) | Indefinite | Low volume, relational |
| Satisfaction Index | Computed from TB + PG | N/A | Hybrid: TB for time, PG for ratings/sentiment |

### Event Types to Track in Tinybird
- `seen` -- visitor heartbeat (presence substitute for analytics)
- `page_view` -- page visited (extensible, not MVP)
- `conversation_started` -- new conversation opened
- `conversation_resolved` -- conversation marked resolved
- `first_response` -- first agent/AI response sent
- `ai_resolved` -- conversation resolved by AI without escalation
- `escalated` -- AI handed off to human
- `feedback_submitted` -- visitor submitted feedback
