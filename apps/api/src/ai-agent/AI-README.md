# AI Agent Architecture

This document describes the architecture, design decisions, and operation of the AI Agent system for Cossistant.

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Architecture](#architecture)
4. [Pipeline Steps](#pipeline-steps)
5. [Reliability Model](#reliability-model)
6. [Scalability](#scalability)
7. [Adding New Features](#adding-new-features)
8. [Debugging Guide](#debugging-guide)
9. [Configuration](#configuration)
10. [Behavior Settings Persistence](#behavior-settings-persistence)
11. [Background Analysis](#background-analysis)
12. [Escalation Handling](#escalation-handling)

---

## Overview

The AI Agent is an autonomous support assistant that can:

- **Respond** to visitor messages
- **Analyze** conversation sentiment
- **Generate** conversation titles automatically
- **Escalate** to human agents when needed
- **Resolve** or categorize conversations
- **Execute** commands from human agents
- **Skip** responding when appropriate

The AI is NOT just a "replier" - it's a decision-making agent that chooses the best action for each situation.

### Key Design Decisions

1. **Structured Output**: The AI returns a structured decision, not free-form text. This prevents unintended responses.

2. **Role Awareness**: The AI understands who sent each message (visitor, human agent, or AI) and adjusts behavior accordingly.

3. **Behavior Settings**: Each AI agent can be configured with different behaviors (response mode, capabilities, etc.). Settings are persisted in the database and configurable via dashboard.

4. **BullMQ Execution**: All processing happens in BullMQ workers for reliability and scalability.

5. **Response Delay**: Configurable delay before responding to make responses feel more natural.

---

## Core Principles

### 1. Reliability First

- All execution happens in BullMQ workers
- Jobs are retried automatically on failure
- Exponential backoff prevents overwhelming systems
- Dead-letter queue captures failed jobs for investigation

### 2. Scalability

- Workers are stateless and horizontally scalable
- No shared mutable state between workers
- All state is stored in PostgreSQL or Redis
- Concurrent job processing with configurable limits

### 3. Idempotency

- Every action can be safely retried
- Actions check for existing state before executing
- Idempotency keys prevent duplicate operations

### 4. Observability

- Comprehensive logging at each pipeline step
- Metrics for timing and success rates
- Audit trail in timeline events

### 5. Maintainability

- Clear folder structure with single-responsibility files
- Numbered pipeline steps show execution order
- Extensive documentation

---

## Architecture

```
apps/api/src/ai-agent/
├── AI-README.md              # This file
├── index.ts                  # Public API exports
│
├── pipeline/                 # 5-step processing pipeline
│   ├── index.ts              # Pipeline orchestrator
│   ├── 1-intake.ts           # Gather context, validate
│   ├── 2-decision.ts         # Should AI act?
│   ├── 3-generation.ts       # Generate response
│   ├── 4-execution.ts        # Execute actions
│   └── 5-followup.ts         # Cleanup, analysis
│
├── context/                  # Build context for AI
│   ├── conversation.ts       # Role-aware history
│   ├── visitor.ts            # Visitor profile
│   ├── roles.ts              # Sender attribution
│   └── state.ts              # Assignees, escalation
│
├── prompts/                  # Prompt engineering
│   ├── system.ts             # Dynamic system prompt
│   ├── templates.ts          # Reusable fragments
│   └── instructions.ts       # Behavior instructions
│
├── tools/                    # LLM tools
│   └── index.ts              # Tool definitions
│
├── actions/                  # Idempotent executors
│   ├── send-message.ts       # Reply to visitor
│   ├── internal-note.ts      # Private note
│   ├── update-status.ts      # Resolve, spam
│   ├── escalate.ts           # Escalate to human
│   ├── update-sentiment.ts   # Update sentiment
│   ├── update-title.ts       # Update title
│   └── ...                   # Other actions
│
├── analysis/                 # Background analysis
│   ├── sentiment.ts          # Analyze sentiment (LLM)
│   ├── title.ts              # Generate title (LLM)
│   └── categorization.ts     # Auto-categorize
│
├── output/                   # Structured output
│   ├── schemas.ts            # Zod schemas
│   └── parser.ts             # Parse & validate
│
├── settings/                 # Behavior config
│   ├── types.ts              # TypeScript types
│   ├── defaults.ts           # Default settings
│   ├── index.ts              # Exports
│   └── validator.ts          # Validation
│
└── events/                   # Realtime events
    ├── typing.ts             # Typing indicator
    └── seen.ts               # Read receipts
```

---

## Pipeline Steps

The AI agent processes messages through a 5-step pipeline:

### Step 1: Intake (`pipeline/1-intake.ts`)

**Purpose**: Gather all context needed for decision-making.

**Actions**:

- Validate AI agent is active
- Load conversation with full context
- Build role-aware message history
- Load visitor information
- Check conversation state (assignees, escalation)

**Early Exit**: If agent is inactive or conversation not found.

### Step 2: Decision (`pipeline/2-decision.ts`)

**Purpose**: Determine if and how the AI should act.

**Decision Factors**:

- Response mode (always, when_no_human, on_mention, manual)
- Human agent activity (recent replies, assignments)
- Escalation status
- Human commands (@ai prefix)
- Pause state

**Outputs**:

- `shouldAct: boolean` - Whether to proceed
- `mode: ResponseMode` - How to respond
- `humanCommand: string | null` - Extracted command

### Step 3: Generation (`pipeline/3-generation.ts`)

**Purpose**: Generate the AI's decision using the LLM.

**Process**:

1. Build dynamic system prompt based on context
2. Format conversation history with role attribution
3. Call LLM with structured output using AI SDK v6 pattern (`generateText` + `Output.object`)
4. Validate structured output exists (fallback to skip if null)
5. Return validated AI decision

**Key**: The AI returns a structured decision, NOT free-form text.

**AI SDK v6 Pattern**:
```typescript
import { generateText, Output } from "ai";

const result = await generateText({
  model: openrouter.chat(model),
  output: Output.object({
    schema: aiDecisionSchema,
  }),
  system: systemPrompt,
  messages,
});

// Access via result.output (not result.object)
const decision = result.output;
```

### Step 4: Execution (`pipeline/4-execution.ts`)

**Purpose**: Execute the AI's chosen actions.

**Actions Supported**:

- `respond` - Send visible message to visitor
- `internal_note` - Add private note for team
- `escalate` - Escalate to human agent
- `resolve` - Mark conversation resolved
- `mark_spam` - Mark as spam
- `skip` - Take no action

**Side Effects**:

- Set priority
- Add to views/categories
- Request participants

### Step 5: Followup (`pipeline/5-followup.ts`)

**Purpose**: Post-processing and cleanup.

**Actions**:

- Clear typing indicator (always)
- Clear workflow state
- Update AI agent usage stats
- Run background analysis (sentiment, title generation)

---

## Reliability Model

### BullMQ Configuration

```typescript
// Worker configuration
{
  concurrency: 10,           // Jobs per worker
  lockDuration: 60_000,      // 60s lock
  stalledInterval: 30_000,   // Check every 30s
  maxStalledCount: 2,        // Retry stalled 2x
}

// Job configuration
{
  attempts: 5,               // Retry up to 5x
  backoff: {
    type: "exponential",
    delay: 5_000,            // 5s, 10s, 20s, 40s, 80s
  },
}
```

### Response Delay

The worker applies a configurable response delay before running the pipeline:

```typescript
// In worker, before pipeline runs:
if (settings.responseDelayMs > 0) {
  await sleep(settings.responseDelayMs);
  // Re-check if still active after delay
  if (!stillActive) return;
}
```

This makes AI responses feel more natural and allows for supersession if a newer message arrives during the delay.

### Failure Handling

1. **Transient Failures**: Automatically retried with exponential backoff
2. **Permanent Failures**: Moved to dead-letter queue after max attempts
3. **Stalled Jobs**: Detected and reprocessed automatically
4. **Cleanup**: Typing indicator always cleared, even on error

### Idempotency

Every action checks for existing state:

```typescript
// Example: Send message
const existing = await findByIdempotencyKey(key);
if (existing) {
  return { status: "already_exists" };
}
// Proceed with creation
```

---

## Scalability

### Horizontal Scaling

Deploy multiple worker instances:

```bash
# Each instance processes 10 concurrent jobs
WORKER_CONCURRENCY=10 node worker.js
```

Workers share the same Redis queue and don't interfere with each other.

### No Shared State

- Pipeline is completely stateless
- All state lives in PostgreSQL or Redis
- Workflow state prevents duplicate processing

### Database Transactions

All mutations are wrapped in transactions:

```typescript
await db.transaction(async (tx) => {
  await tx.insert(message);
  await tx.insert(event);
});
```

---

## Adding New Features

### Adding a New Tool

1. Create file in `tools/`:

```typescript
// tools/my-tool.ts
export const myTool = tool({
  description: "What this tool does",
  parameters: z.object({ ... }),
  execute: async (params) => { ... },
});
```

2. Register in `tools/index.ts`:

```typescript
import { myTool } from "./my-tool";
// Add to tools object
```

### Adding a New Action

1. Create file in `actions/`:

```typescript
// actions/my-action.ts
export async function myAction(params: MyActionParams): Promise<void> {
  // Check idempotency
  // Execute action
  // Create timeline event
}
```

2. Export in `actions/index.ts`
3. Handle in `pipeline/4-execution.ts`
4. Add to output schema if needed

### Adding a New Decision Factor

1. Update `pipeline/2-decision.ts`:

```typescript
// Add new check
if (shouldCheckNewFactor(input)) {
  return { shouldAct: false, reason: "..." };
}
```

2. Update settings types if configurable

---

## Debugging Guide

### Common Issues

**AI not responding**:

1. Check agent is active: `aiAgent.isActive`
2. Check response mode: `settings.responseMode`
3. Check for human activity: Recent human messages?
4. Check escalation status: Is conversation escalated but not handled?

**Duplicate messages**:

1. Check idempotency key handling
2. Check workflow state in Redis
3. Check job deduplication settings

**Slow responses**:

1. Check response delay setting: `settings.responseDelayMs`
2. Check LLM response time
3. Check database query performance
4. Check context size (message count)

**Escalated conversations not getting AI responses**:

1. Check `escalatedAt` vs `escalationHandledAt`
2. AI skips escalated conversations until a human handles them
3. Human handling is triggered when a human agent sends a message

### Logging

Each step logs with prefix:

```
[ai-agent:intake] ...
[ai-agent:decision] ...
[ai-agent:generation] ...
[ai-agent:execution] ...
[ai-agent:followup] ...
[ai-agent:analysis] ...
[worker:ai-agent] ...
```

### Inspecting Jobs

Use BullMQ admin tools to:

- View pending jobs
- Inspect failed jobs
- Retry failed jobs
- Clear stuck jobs

---

## Configuration

### Behavior Settings

Each AI agent has configurable behavior stored in `aiAgent.behaviorSettings`:

```typescript
type AiAgentBehaviorSettings = {
  // When to respond
  responseMode: "always" | "when_no_human" | "on_mention" | "manual";
  responseDelayMs: number; // 0-30000ms

  // Human interaction
  pauseOnHumanReply: boolean;
  pauseDurationMinutes: number | null;

  // Capabilities
  canResolve: boolean;
  canMarkSpam: boolean;
  canAssign: boolean;
  canSetPriority: boolean;
  canCategorize: boolean;
  canEscalate: boolean;

  // Escalation
  defaultEscalationUserId: string | null;
  autoAssignOnEscalation: boolean;

  // Background analysis
  autoAnalyzeSentiment: boolean;
  autoGenerateTitle: boolean;
  autoCategorize: boolean;
};
```

### Response Modes

| Mode            | Description                              |
| --------------- | ---------------------------------------- |
| `always`        | Respond to every visitor message         |
| `when_no_human` | Only respond if no human agent is active |
| `on_mention`    | Only respond when explicitly mentioned   |
| `manual`        | Only respond to human commands           |

### Human Commands

Human agents can give commands using `@ai`:

```
@ai summarize this conversation
@ai draft a response about shipping
@ai what do we know about this customer?
```

Commands always trigger AI processing regardless of response mode.

---

## Behavior Settings Persistence

### Overview

Behavior settings are stored in the `aiAgent.behaviorSettings` JSONB column and can be configured via the dashboard.

### API Endpoints

**Get Settings**: `trpc.aiAgent.getBehaviorSettings`
- Returns settings merged with defaults
- Ensures all fields have values even if not stored

**Update Settings**: `trpc.aiAgent.updateBehaviorSettings`
- Accepts partial settings
- Merges with existing settings
- Returns updated settings

### Dashboard UI

The behavior settings page (`/[websiteSlug]/agents/behavior`) provides:
- Response mode and delay configuration
- Human interaction settings
- Capability toggles
- Background analysis toggles

### Settings Flow

```
Dashboard Form
    ↓
trpc.aiAgent.updateBehaviorSettings
    ↓
db.updateAiAgentBehaviorSettings (merges with existing)
    ↓
aiAgent.behaviorSettings (JSONB column)
    ↓
getBehaviorSettings() (merges with defaults)
    ↓
Used in pipeline decision/execution
```

---

## Background Analysis

### Overview

Background analysis runs in the followup step after the main AI action completes. These are non-blocking, fire-and-forget operations that enhance conversation data.

### Sentiment Analysis (`analysis/sentiment.ts`)

Analyzes visitor message sentiment using LLM (gpt-4o-mini):

- **Trigger**: `settings.autoAnalyzeSentiment = true`
- **Skips if**: Sentiment already analyzed
- **Output**: `positive | neutral | negative` with confidence score
- **Creates**: Private `AI_ANALYZED` timeline event

### Title Generation (`analysis/title.ts`)

Generates a brief title for the conversation:

- **Trigger**: `settings.autoGenerateTitle = true` AND no title exists
- **Uses**: First few messages to generate context
- **Output**: Max 100 character title
- **Creates**: Private `TITLE_GENERATED` timeline event

### Auto-Categorization (`analysis/categorization.ts`)

Automatically adds conversations to matching views (placeholder - not yet implemented).

---

## Escalation Handling

### Overview

When the AI escalates a conversation, it sets `escalatedAt`. The conversation remains "escalated" until a human agent handles it.

### Escalation Flow

```
1. AI decides to escalate
   ↓
2. conversation.escalatedAt = now
   conversation.escalatedByAiAgentId = aiAgent.id
   conversation.escalationReason = "..."
   ↓
3. AI skips escalated conversations (decision step)
   ↓
4. Human agent sends a message
   ↓
5. conversation.escalationHandledAt = now
   conversation.escalationHandledByUserId = user.id
   ↓
6. AI can respond again (escalation handled)
```

### Key Fields

| Field | Description |
|-------|-------------|
| `escalatedAt` | When the AI escalated the conversation |
| `escalatedByAiAgentId` | Which AI agent escalated |
| `escalationReason` | Why the AI escalated |
| `escalationHandledAt` | When a human handled it (null = still escalated) |
| `escalationHandledByUserId` | Which human handled it |

### Decision Logic

```typescript
// In pipeline/2-decision.ts
const isEscalated = conv.escalatedAt && !conv.escalationHandledAt;
if (isEscalated) {
  return { shouldAct: false, reason: "Conversation is escalated" };
}
```

### Auto-Handling

When a human agent sends a message to an escalated conversation, the system automatically:
1. Checks if `escalatedAt` is set and `escalationHandledAt` is null
2. Sets `escalationHandledAt` to the current timestamp
3. Sets `escalationHandledByUserId` to the human agent's ID

This is handled in `utils/timeline-item.ts` when creating message timeline items.

---

## Event Visibility

### Public Events (visible to visitors)

- Message sent
- Conversation resolved
- Priority changed
- Assigned

### Private Events (team only)

- `AI_ANALYZED` - Sentiment analysis
- `TITLE_GENERATED` - Title generation
- `AI_ESCALATED` - Escalation record
- Internal notes

---

## Future Improvements

1. **RAG Integration**: Connect to knowledge base for better answers
2. **Streaming Responses**: Stream AI responses for better UX
3. **Multi-Agent**: Support for multiple specialized agents
4. **Scheduled Tasks**: Background analysis on schedule
5. **Metrics Dashboard**: Real-time agent performance metrics
6. **Auto-Categorization**: LLM-based conversation categorization
7. **Memory System**: Remember previous conversations with the same visitor
