# Task Plan: Inbox Analytics Fixes + Feedback System

## Goal

Fix inbox analytics to display correct data and create a new standalone feedback system that:
1. Allows visitors to rate + leave written feedback
2. Can be tied to a conversation OR be standalone (product feedback)
3. Feeds into the satisfaction index for analytics

---

## Phase 1: Investigate Analytics Issues - IN PROGRESS

### 1.1 Unique Visitors Query Issue
**Status:** Needs investigation

**Current Query Logic:**
```sql
SELECT COUNT(DISTINCT COALESCE(contact_id, id))
FROM visitor
WHERE organization_id = ?
  AND website_id = ?
  AND deleted_at IS NULL
  AND is_test = false  -- This might filter everything!
  AND last_seen_at IS NOT NULL
  AND last_seen_at >= range.start
  AND last_seen_at < range.end
```

**Possible Issues:**
- `isTest` might be `true` for all visitors in dev/testing
- `lastSeenAt` might not be set (but `upsertVisitor` does set it)
- Date range might be wrong

**Action:** Debug by running raw queries against the database

### 1.2 Median Response Time Issue
**Status:** Understood

**Root Cause:** Query requires `firstResponseAt IS NOT NULL`, which is only set when a team member or AI agent sends a message to a conversation.

**Current Logic (in timeline-item.ts:267-283):**
```ts
const isResponseFromTeam = Boolean(userId || aiAgentId);
if (isResponseFromTeam) {
  // Updates firstResponseAt only if null
}
```

**Issue:** If no conversations have received a response from team/AI, median will be null/0.

**Action:** This is working correctly - just no data yet. No fix needed.

### 1.3 Satisfaction Index Issue
**Status:** Understood

**Root Cause:** Query requires `visitorRating IS NOT NULL`, but:
1. The rating columns were just added in migration 0037
2. No ratings have been submitted yet
3. The current rating UI only shows on resolved conversations

**Action:** This will be fixed by the new feedback system.

---

## Phase 2: Create Feedback Table - PENDING

### 2.1 Database Schema Design

**New Table: `feedback`**

| Column | Type | Description |
|--------|------|-------------|
| id | ULID (PK) | Unique identifier |
| organization_id | ULID (FK) | Reference to organization |
| website_id | ULID (FK) | Reference to website (required) |
| conversation_id | nanoid (FK, nullable) | Optional conversation reference |
| visitor_id | ULID (FK, nullable) | Visitor who submitted feedback |
| contact_id | ULID (FK, nullable) | Contact if visitor has one |
| rating | integer (1-5) | Star rating |
| comment | text | Written feedback (optional) |
| source | enum | Where feedback was collected (widget, api, email) |
| created_at | timestamp | When feedback was submitted |
| updated_at | timestamp | Last update time |
| deleted_at | timestamp | Soft delete |

**Indexes:**
- `feedback_org_website_created_idx` - For analytics queries by date range
- `feedback_website_idx` - For listing feedback by website
- `feedback_conversation_idx` - For looking up feedback by conversation
- `feedback_visitor_idx` - For looking up feedback by visitor

### 2.2 Schema File Changes

Create: `apps/api/src/db/schema/feedback.ts`

```ts
export const feedbackSourceEnum = pgEnum("feedback_source", [
  "widget",
  "api",
  "email"
]);

export const feedback = pgTable("feedback", {
  id: ulidPrimaryKey("id"),
  organizationId: ulidReference("organization_id"),
  websiteId: ulidReference("website_id"),
  conversationId: nanoidNullableReference("conversation_id"),
  visitorId: ulidNullableReference("visitor_id"),
  contactId: ulidNullableReference("contact_id"),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  source: feedbackSourceEnum("source").default("widget").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Analytics index
  index("feedback_org_website_created_idx").on(
    table.organizationId,
    table.websiteId,
    table.createdAt,
    table.deletedAt
  ),
  // Lookup indexes
  index("feedback_website_idx").on(table.websiteId),
  index("feedback_conversation_idx").on(table.conversationId),
  index("feedback_visitor_idx").on(table.visitorId),
]);
```

### 2.3 Migration

Run: `bun run db:generate` to create migration file

---

## Phase 3: Backend API Implementation - PENDING

### 3.1 Types

Add to `packages/types`:
- `FeedbackSource` enum
- `submitFeedbackRequestSchema`
- `submitFeedbackResponseSchema`
- `FeedbackResponse` type

### 3.2 REST API Endpoint

Create: `POST /api/v1/feedback`

**Request Body:**
```ts
{
  rating: number; // 1-5
  comment?: string;
  conversationId?: string; // Optional
  visitorId: string;
}
```

**Response:**
```ts
{
  id: string;
  rating: number;
  comment: string | null;
  conversationId: string | null;
  createdAt: string;
}
```

### 3.3 Update Analytics Query

Modify `apps/api/src/db/queries/inbox-analytics.ts`:

**Old satisfaction query:** Uses `conversation.visitorRating`
**New satisfaction query:** Uses `feedback.rating` table

```ts
// New satisfaction query
db.select({
  average: sql<number | null>`AVG(${feedback.rating}::float / 5.0 * 100)`,
})
.from(feedback)
.where(
  and(
    eq(feedback.organizationId, organizationId),
    eq(feedback.websiteId, websiteId),
    isNull(feedback.deletedAt),
    gte(feedback.createdAt, range.start),
    lt(feedback.createdAt, range.end)
  )
)
```

---

## Phase 4: Frontend Implementation - PENDING

### 4.1 Update Support Widget

Modify `packages/react/src/support/components/conversation-resolved-feedback.tsx`:
- Add optional text input for written feedback
- Call new feedback API endpoint
- Support standalone feedback (not tied to conversation)

### 4.2 Add Standalone Feedback Component

Create: `packages/react/src/support/components/feedback-form.tsx`
- Can be used outside of conversation context
- Rating + comment form
- Calls the same feedback API

---

## Phase 5: Testing & Verification - PENDING

### 5.1 Verify Analytics Queries
- Run queries directly against database
- Debug `isTest` flag issue for unique visitors
- Verify date range calculations

### 5.2 Test Feedback Flow
- Submit feedback with conversation
- Submit standalone feedback
- Verify satisfaction index updates

---

## Files to Create/Modify

### Create:
1. `apps/api/src/db/schema/feedback.ts` - New schema
2. `apps/api/drizzle/migrations/0038_*.sql` - Migration (auto-generated)
3. `packages/types/src/api/feedback.ts` - Types and schemas
4. `packages/react/src/support/components/feedback-form.tsx` - Standalone form

### Modify:
1. `apps/api/src/db/schema/index.ts` - Export new schema
2. `apps/api/src/db/queries/inbox-analytics.ts` - Update satisfaction query
3. `apps/api/src/rest/routers/conversation.ts` - Add feedback endpoint OR create new router
4. `packages/react/src/support/components/conversation-resolved-feedback.tsx` - Add comment field
5. `packages/types/src/api/index.ts` - Export feedback types

---

## Questions to Clarify

1. **Should we keep the old `visitorRating` on conversation table?**
   - Option A: Keep it as a denormalized quick-access field
   - Option B: Remove it and only use feedback table
   - Recommendation: Keep for now, but prefer feedback table for analytics

2. **Feedback source enum values?**
   - widget, api, email - are these sufficient?

3. **Should feedback be editable/deletable by visitors?**
   - Currently planning: No, once submitted it's final
