# Task Plan: Migrate Analytics to Tinybird

## Goal

Replace DB-based analytics with Tinybird for:
1. **Inbox analytics** (response time, resolution time, AI rate, satisfaction, visitors)
2. **Visitor "seen" events** with geolocation (online tracking, globe-ready)
3. **Page view tracking** (schema-ready, not wired up in MVP)

Keep it lean: one datasource, no materialized views initially, 3-week retention for free tier (enforced at query time), 90-day TTL on data.

---

## Phase 1: Tinybird Project Setup `PENDING`

### 1.1 Create Tinybird project structure at repo root

```
tinybird/
  datasources/
    analytics_events.datasource
  endpoints/
    inbox_analytics.pipe
    active_visitors.pipe
    visitor_locations.pipe
```

### 1.2 Define `visitor_events.datasource` (high-volume, short-lived)

Raw visitor activity events. TTL: 30 days (all tiers -- these are operational, not KPIs).

```
SCHEMA >
    `timestamp` DateTime              `json:$.timestamp`,
    `website_id` String               `json:$.website_id`,
    `visitor_id` String               `json:$.visitor_id`,
    `session_id` String               `json:$.session_id`,
    `event_type` LowCardinality(String) `json:$.event_type`,
    `country_code` LowCardinality(String) `json:$.country_code`,
    `city` LowCardinality(String)     `json:$.city`,
    `latitude` Float32               `json:$.latitude`,
    `longitude` Float32              `json:$.longitude`,
    `device_type` LowCardinality(String) `json:$.device_type`,
    `browser` LowCardinality(String)  `json:$.browser`,
    `page_url` String                `json:$.page_url`

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"
ENGINE_SORTING_KEY "website_id, toDate(timestamp), event_type"
ENGINE_TTL "timestamp + toIntervalDay(30)"
```

**Event types:** `seen`, `page_view`

**`last_seen` trace:** The existing `lastSeenAt` field on the visitor table in PostgreSQL persists beyond Tinybird TTL, so we always know when a visitor was last active even after raw events are purged.

### 1.3 Define `conversation_metrics.datasource` (low-volume, long-lived)

Conversation lifecycle events. No TTL for paid customers (business KPIs trended over years). Free tier: 21 days enforced at query time.

```
SCHEMA >
    `timestamp` DateTime              `json:$.timestamp`,
    `website_id` String               `json:$.website_id`,
    `visitor_id` String               `json:$.visitor_id`,
    `event_type` LowCardinality(String) `json:$.event_type`,
    `conversation_id` String          `json:$.conversation_id`,
    `duration_seconds` Float32       `json:$.duration_seconds`

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"
ENGINE_SORTING_KEY "website_id, toDate(timestamp), event_type"
```

**Event types:** `conversation_started`, `conversation_resolved`, `first_response`, `ai_resolved`, `escalated`, `feedback_submitted`

**`duration_seconds`:** time delta for `first_response` and `conversation_resolved` events (computed at ingestion).

**No `ENGINE_TTL`** -- data kept indefinitely. On plan downgrade/unsubscribe: delete by `website_id` filter.

**Note:** No geo/device fields here -- these are conversation-level metrics, not visitor activity. Keeps the schema lean.

**Why `website_id` first in sort key (not `organization_id`):**
- Most queries filter by website, not org
- Org can be derived from website; no need to scan by org
- Keeps sorting lean

### 1.4 Define pipes (API endpoints)

**`inbox_analytics.pipe`** -- Reads from `conversation_metrics` datasource. Single consolidated endpoint returning all dashboard metrics:
- Median response time (`quantile(0.5)` on `first_response` events' `duration_seconds`)
- Median resolution time (`quantile(0.5)` on `conversation_resolved` events' `duration_seconds`)
- % AI handled (count `ai_resolved` / count `conversation_resolved`)
- Accepts params: `website_id`, `date_from`, `date_to`
- Returns current period + previous period in one call (saves QPS)
- Note: unique visitors comes from `visitor_events` (separate pipe or combined in tRPC)

**`active_visitors.pipe`** -- Reads from `visitor_events` datasource. Real-time active visitors:
- `SELECT visitor_id, any(city), any(country_code), any(latitude), any(longitude), max(timestamp) as last_seen FROM visitor_events WHERE event_type = 'seen' AND timestamp > now() - INTERVAL 10 MINUTE AND website_id = {{String(website_id)}} GROUP BY visitor_id`
- Accepts params: `website_id`, `minutes` (default 10)

**`visitor_locations.pipe`** -- Reads from `visitor_events` datasource. Geo aggregation for globe:
- Groups `seen` events by lat/lng with counts
- Accepts params: `website_id`, `minutes` (default 5)

**`unique_visitors.pipe`** -- Reads from `visitor_events` datasource. Unique visitor count by date range:
- `uniq(visitor_id)` on `seen` events
- Accepts params: `website_id`, `date_from`, `date_to`

---

## Phase 2: Backend Integration (`apps/api`) `PENDING`

### 2.1 Create Tinybird client library

**Create: `apps/api/src/lib/tinybird.ts`**

```ts
// Thin wrapper around Tinybird Events API + Pipe query API
// - sendEvent(datasource, events[]) -- POST NDJSON to Events API (fire-and-forget)
// - queryPipe(pipeName, params) -- GET pipe endpoint with auth
// - deleteByFilter(datasource, filter) -- DELETE for plan cancellation cleanup
// Env vars: TINYBIRD_HOST, TINYBIRD_APPEND_TOKEN, TINYBIRD_READ_TOKEN
```

Keep it minimal: three functions, no SDK dependency.

### 2.2 Emit events from existing code paths

**Where to emit `seen` events (-> `visitor_events` datasource):**
- In `markVisitorPresence()` (`apps/api/src/services/presence.ts`)
- Already called on WebSocket connection + REST message endpoints
- Add: fire-and-forget `sendEvent("visitor_events", [{ event_type: "seen", ... }])`
- Include geo data already available from visitor record / edge headers

**Where to emit conversation lifecycle events (-> `conversation_metrics` datasource):**
- `conversation_started`: in conversation creation mutation
- `first_response`: in `apps/api/src/utils/timeline-item.ts` where `firstResponseAt` is set
- `conversation_resolved`: in `apps/api/src/db/mutations/conversation.ts` resolve action
- `ai_resolved`: in `apps/api/src/ai-agent/actions/update-status.ts` when AI resolves
- `escalated`: in escalation action

**`duration_seconds` for time-based events (on `conversation_metrics`):**
- `first_response`: `(now - conversation.startedAt)` in seconds
- `conversation_resolved`: `(now - conversation.startedAt)` in seconds

### 2.3 Replace analytics tRPC endpoint

**Modify: `apps/api/src/trpc/routers/conversation.ts`** (getInboxAnalytics)

Replace 7 parallel PG queries with 2 Tinybird pipe calls + 2 PG queries:
```ts
const [metrics, uniqueVisitors, feedbackRating, sentimentScore] = await Promise.all([
  queryPipe("inbox_analytics", { website_id, date_from, date_to, prev_date_from, prev_date_to }),
  queryPipe("unique_visitors", { website_id, date_from, date_to }),
  db.select(...).from(feedback),   // rating score (PG, low volume)
  db.select(...).from(conversation), // sentiment score (PG, low volume)
]);
```

**Satisfaction Index stays hybrid:**
- Response time score + resolution rate: from Tinybird (`inbox_analytics` pipe)
- Rating score: from PostgreSQL `feedback` table (low volume, stays in PG)
- Sentiment score: from PostgreSQL `conversation` table (set by AI agent)
- Combine in the tRPC procedure

### 2.4 Remove old analytics DB queries

**Delete: `apps/api/src/db/queries/inbox-analytics.ts`** (entirely replaced by Tinybird)

### 2.5 Add retention-aware query param

In the tRPC procedure, compute `date_from` based on customer tier:
```ts
const maxRetentionDays = isPaying ? 90 : 21;
const effectiveDateFrom = max(requestedDateFrom, now - maxRetentionDays);
```

This enforces 3-week limit for free tier at query time (Tinybird TTL handles physical deletion at 90d).

---

## Phase 3: "Seen" Events & Active Visitors `PENDING`

### 3.1 Emit `seen` events from widget/SDK

**Option A (chosen): Server-side emission**
- Widget already pings the API (WebSocket heartbeat / REST calls)
- `markVisitorPresence()` already fires on these -- just add Tinybird event
- No new client-side code needed

**Why not client-side:** APPEND tokens can't be safely exposed in browser.

### 3.2 Wire up active visitors endpoint

**Modify: `apps/api/src/trpc/routers/visitor.ts`** (listOnline)

Add a new field or replace data source:
- Keep Redis for instant presence (online/away status for chat UI)
- Add Tinybird query for "active visitors with geo" (for dashboard / globe)
- The `active_visitors` pipe returns visitor_id + last_seen + geo data

### 3.3 Ensure geo data flows through

Visitor geo data is already resolved from edge headers in:
- `apps/api/src/rest/routers/visitor.ts` (PATCH endpoint)
- `apps/api/src/services/presence.ts` (profile hydration)

When emitting `seen` events, include `country_code`, `city`, `latitude`, `longitude` from the visitor record or edge headers available in the request context.

---

## Phase 4: Frontend Updates (`apps/web`) `PENDING`

### 4.1 Update analytics display

**Modify: `apps/web/src/components/inbox-analytics/`**

The component already works with the shape returned by `useInboxAnalytics`. Changes:
- Remove `websiteSlug === "cossistant"` guard -- enable for all websites
- Response types should remain compatible (same metric names)
- Adjust range options if needed (free tier max = 21 days)

### 4.2 Update hook

**Modify: `apps/web/src/data/use-inbox-analytics.tsx`**

Minimal changes -- the tRPC endpoint signature stays the same. Just:
- Remove the `websiteSlug === "cossistant"` check
- Potentially add tier-based range constraints in the UI

### 4.3 Visitor presence context (optional enhancement)

**File: `apps/web/src/contexts/visitor-presence.tsx`**

Currently polls Redis-backed endpoint every 15s. For the globe feature:
- Add a separate hook for geo-aggregated data from `visitor_locations` pipe
- This is a future enhancement, not MVP

---

## Phase 5: Type Updates (`packages/types`) `PENDING`

### 5.1 Analytics types

**Modify: `packages/types/src/trpc/conversation.ts`**

- Keep `InboxAnalyticsMetrics` interface (same shape)
- Add `AnalyticsEventType` union type
- Add `TinybirdEvent` schema for event payloads

### 5.2 Presence types

**Modify: `packages/types/src/trpc/visitor.ts`**

- Add `VisitorGeoLocation` type for globe data
- Keep existing `VisitorPresenceEntry` (Redis-backed, unchanged)

---

## Phase 6: Cleanup & Testing `PENDING`

### 6.1 Remove dead code

- Delete `apps/api/src/db/queries/inbox-analytics.ts`
- Delete `apps/api/src/utils/cache/inbox-analytics-cache.ts` (if still exists)
- Remove any unused imports

### 6.2 Environment setup

Add to `.env.example`:
```
TINYBIRD_HOST=https://api.us-east.aws.tinybird.co
TINYBIRD_APPEND_TOKEN=
TINYBIRD_READ_TOKEN=
```

### 6.3 Testing

- Deploy Tinybird datasource + pipes via `tb deploy` (or manual)
- Verify event ingestion with `tb datasource ls` / `tb sql`
- Test dashboard analytics render with real data
- Test active visitors with geo data
- Verify free tier sees max 21 days
- Verify TTL cleanup (can simulate with test data)

### 6.4 CI/CD

- Add `tinybird/` to the repo
- Consider `tb deploy` in CI pipeline (future)
- For now: manual deploy via Tinybird CLI

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `tinybird/datasources/visitor_events.datasource` | Seen/page_view events, 30d TTL |
| `tinybird/datasources/conversation_metrics.datasource` | Conversation lifecycle, no TTL |
| `tinybird/endpoints/inbox_analytics.pipe` | Dashboard metrics (from conversation_metrics) |
| `tinybird/endpoints/unique_visitors.pipe` | Unique visitor counts (from visitor_events) |
| `tinybird/endpoints/active_visitors.pipe` | Real-time active visitors (from visitor_events) |
| `tinybird/endpoints/visitor_locations.pipe` | Geo aggregation for globe (from visitor_events) |
| `apps/api/src/lib/tinybird.ts` | Tinybird client (ingest + query + delete) |

### Modify
| File | Change |
|------|--------|
| `apps/api/src/services/presence.ts` | Add `seen` event emission |
| `apps/api/src/db/mutations/conversation.ts` | Add lifecycle event emissions |
| `apps/api/src/utils/timeline-item.ts` | Add `first_response` event |
| `apps/api/src/ai-agent/actions/update-status.ts` | Add `ai_resolved` event |
| `apps/api/src/trpc/routers/conversation.ts` | Replace PG queries with Tinybird pipe |
| `apps/api/src/trpc/routers/visitor.ts` | Add Tinybird-backed geo query |
| `apps/web/src/components/inbox-analytics/inbox-analytics.tsx` | Remove cossistant guard |
| `apps/web/src/data/use-inbox-analytics.tsx` | Remove cossistant guard |
| `packages/types/src/trpc/conversation.ts` | Add event types |
| `.env.example` | Add Tinybird env vars |

### Delete
| File | Reason |
|------|--------|
| `apps/api/src/db/queries/inbox-analytics.ts` | Replaced by Tinybird |

---

## Design Decisions & Tradeoffs

### Why two datasources (not one)
- Different retention needs: visitor events are operational (30d), conversation metrics are business KPIs (indefinite)
- Tinybird TTL is per-datasource, not per-row -- two datasources is the only clean way
- Still lean: only 2 datasources, both with the same sorting key pattern
- Conversation metrics has no geo/device fields -- keeps it slim

### Why no materialized views initially
- Adds complexity; queries on raw data should be fast with proper sorting key
- Can add later if p95 query time >5s
- Keeps Tinybird setup minimal and cheap

### Why Redis presence stays
- Tinybird is analytics-grade (seconds of latency), not real-time presence
- Chat UI needs instant online/away status
- Redis is already working well for this

### Why satisfaction index is hybrid (TB + PG)
- Ratings and sentiment live in PG (low volume, relational)
- Response time and resolution rate compute naturally from TB events
- Avoids duplicating PG data into Tinybird

### Why `page_view` is schema-ready but not wired
- User wants it to "stay possible"
- Schema includes `page_url` field
- Widget can emit these later with zero Tinybird schema changes
- Just needs a `sendEvent` call from the SDK

### Why split retention strategy
- `visitor_events`: 30-day TTL for all tiers (operational data, not KPIs)
- `conversation_metrics`: no TTL (business KPIs trended over years for paid customers)
- Free tier: 21 days enforced at query time on both datasources
- On plan cancellation: `deleteByFilter(datasource, "website_id = 'xxx'")` on both
- `lastSeenAt` persists in PostgreSQL visitor table as a trace after event purge
