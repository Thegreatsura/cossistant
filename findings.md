# Findings: Inbox Analytics Audit

## Summary

The inbox analytics feature has **a critical cache key collision bug** that causes data from different time periods to be mixed up and incorrectly displayed.

---

## Critical Bug: Cache Tag Collision

### Evidence

In `apps/api/src/db/queries/inbox-analytics.ts`:

```ts
export async function getInboxAnalyticsMetrics(
  db: Database,
  params: {
    organizationId: string;
    websiteId: string;
    range: AnalyticsRange;  // <-- Different for current vs previous
    rangeDays: InboxAnalyticsRangeDays;  // <-- Same for both!
  }
): Promise<InboxAnalyticsMetrics> {
  const { organizationId, websiteId, range, rangeDays } = params;
  const cacheOptions = {
    tag: getInboxAnalyticsCacheTag(websiteId, rangeDays),  // PROBLEM: Same tag for both calls!
    config: { ex: CACHE_TTL_SECONDS },
  };
```

In `apps/api/src/trpc/routers/conversation.ts`:

```ts
const [current, previous] = await Promise.all([
  getInboxAnalyticsMetrics(db, {
    organizationId: websiteData.organizationId,
    websiteId: websiteData.id,
    rangeDays,
    range: {
      start: currentStart.toISOString(),  // e.g., 7 days ago
      end: currentEnd.toISOString(),      // e.g., now
    },
  }),
  getInboxAnalyticsMetrics(db, {
    organizationId: websiteData.organizationId,
    websiteId: websiteData.id,
    rangeDays,
    range: {
      start: previousStart.toISOString(),  // e.g., 14 days ago
      end: previousEnd.toISOString(),      // e.g., 7 days ago
    },
  }),
]);
```

### What Happens

1. First request calls `getInboxAnalyticsMetrics` for **current period** (last 7 days)
2. All 5 queries run and cache with tag `inbox-analytics:websiteId:7`
3. Second request (in parallel) calls `getInboxAnalyticsMetrics` for **previous period** (7-14 days ago)
4. Cache lookup finds tag `inbox-analytics:websiteId:7` **already exists**
5. Returns **cached data from current period** for previous period!

This explains:
- **Identical median times**: Same cached data returned for both periods
- **Wrong satisfaction index** (34,528/100): Possibly `uniqueVisitors` count being returned in place of satisfaction
- **Same value appearing twice** (34,528): Cache collision returning same values

---

## Analysis of Each Cached Query

The function runs 5 separate queries in parallel, all using the **same cache tag**:

| Query | Purpose | Cache Key (Current) |
|-------|---------|---------------------|
| `medianResponse` | Median first response time | `inbox-analytics:ws:7` |
| `medianResolution` | Median resolution time | `inbox-analytics:ws:7` |
| `resolutionCounts` | AI handled rate | `inbox-analytics:ws:7` |
| `satisfaction` | Satisfaction index | `inbox-analytics:ws:7` |
| `uniqueVisitors` | Unique visitor count | `inbox-analytics:ws:7` |

**Problem**: All 5 queries use the same tag. When Drizzle caches by tag, it stores the **query result** keyed by tag. If multiple queries use the same tag, they may overwrite or retrieve each other's results.

---

## Cache Implementation Analysis

Looking at `apps/api/src/db/cache/bun-redis-cache.ts`:

```ts
override async get(
  key: string,
  tables: string[],
  isTag = false,
  isAutoInvalidate?: boolean
): Promise<any[] | undefined> {
  // ...
  if (isTag) {
    const result = (await this.redis.eval(
      getByTagScript,
      1,
      BunRedisCache.tagsMapKey,
      key  // <-- This is the tag
    )) as string | null;
    return this.deserialize(result);
  }
  // ...
}
```

When using tags, Drizzle stores in Redis:
1. A mapping from tag → composite table key
2. The value in the composite table hash

If all 5 queries use the same tag, they're competing for the same cache slot!

---

## Why Data Sometimes Appears, Sometimes Doesn't

Cache TTL is 300 seconds (5 minutes). The behavior depends on:

1. **First request after cache expires**: Fetches fresh data (may be correct)
2. **Subsequent requests within TTL**: Returns cached (potentially wrong) data
3. **Race conditions**: Parallel queries may cache in unpredictable order

---

## Recommended Fix

### Option A: Include Date Range in Cache Tag (Recommended)

```ts
// In inbox-analytics.ts
const cacheOptions = {
  tag: `${getInboxAnalyticsCacheTag(websiteId, rangeDays)}:${range.start}:${range.end}`,
  config: { ex: CACHE_TTL_SECONDS },
};
```

### Option B: Use Unique Tags Per Query Type

```ts
const medianResponseCache = { tag: `${baseTag}:medianResponse:${range.start}` };
const medianResolutionCache = { tag: `${baseTag}:medianResolution:${range.start}` };
// etc.
```

### Option C: Remove Caching for Analytics

Analytics are aggregate queries with good indexes. The cache adds complexity and bugs. Consider:

```ts
// Remove .$withCache() calls entirely for analytics
const [medianResponse, ...] = await Promise.all([
  db.select(...).from(conversation).where(...),  // No cache
  // ...
]);
```

---

## Performance Considerations

Current indexes support these queries well:
- `conversation_org_website_started_idx`
- `conversation_org_website_first_response_idx`
- `conversation_org_website_resolved_idx`
- `conversation_org_website_rating_idx`

With proper indexes, these aggregate queries should be fast (< 100ms) even without caching. The 5-minute cache TTL suggests performance isn't critical.

---

## Additional Observations

### 1. `invalidateInboxAnalyticsCacheForWebsite` Never Called

The function exists but is never used in the codebase:

```ts
export async function invalidateInboxAnalyticsCacheForWebsite(
  db: Database,
  websiteId: string
): Promise<void> {
  const tags = INBOX_ANALYTICS_RANGE_DAYS.map((range) =>
    getInboxAnalyticsCacheTag(websiteId, range)
  );
  await db.$cache.invalidate({ tags });
}
```

This should be called when:
- A conversation is resolved
- A conversation receives a rating
- A visitor is created

### 2. No Table Auto-Invalidation

Using custom tags disables automatic table-based invalidation. The cache won't clear when the `conversation` or `visitor` tables are mutated.

### 3. Feature Limited to "cossistant" Website

```ts
if (input.websiteSlug !== "cossistant") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Analytics are not enabled for this website",
  });
}
```

And in the frontend:
```ts
const query = useInboxAnalytics({
  websiteSlug,
  rangeDays,
  enabled: websiteSlug === "cossistant",
});
```

This is intentional (beta/testing) but should be documented.
