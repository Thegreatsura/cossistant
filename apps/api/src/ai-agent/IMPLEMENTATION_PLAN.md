# AI Agent: SDK Alignment & Tool Integration

## Summary

Refactor the AI agent to properly use Vercel AI SDK tools for context gathering while keeping structured output for decisions. Enrich prompts with real-time visitor/conversation context.

---

## Architecture Decision

### Keep: Structured Output for Final Decisions
The `aiDecisionSchema` pattern works well:
- Predictable, validated responses
- "Never go silent" enforcement
- Clear action types: `respond`, `escalate`, `resolve`, `skip`

### Add: SDK Tools (Two Categories)

**1. Context-Gathering Tools**
- `searchKnowledgeBase(query)` - Vector search on docs
- Future: `getOrderStatus(orderId)`, custom user tools

**2. Side-Effect Tools (NEW)**
- `setConversationTitle(title)` - Set/update title inline
- `updateSentiment(sentiment, reason)` - Update as tone shifts
- `setPriority(priority)` - Set urgency
- `addToCategory(categoryId)` - Categorize conversation

**Why side-effect tools?**
Currently, title/sentiment run as **separate LLM calls** in followup.
Converting to tools means:
- Single LLM call does everything
- AI has full context when setting title
- Sentiment updates naturally as conversation evolves
- More efficient (1 call vs 3)

### Add: Real-Time Context in Prompts
Enrich system prompt with:
- Current time (visitor's timezone)
- Conversation stats (duration, message count)
- Team availability

---

## Implementation Phases

### Phase 1: Real-Time Context Enrichment

**New file: `context/temporal.ts`**
```typescript
export type TemporalContext = {
  currentTime: string;        // "2:30 PM"
  currentDate: string;        // "Monday, January 12, 2026"  
  visitorLocalTime: string;   // In their timezone
  greeting: string;           // "Good afternoon"
};

export function getTemporalContext(timezone: string | null): TemporalContext;
```

**New file: `context/conversation-meta.ts`**
```typescript
export type ConversationMeta = {
  startedAgo: string;         // "2 hours ago"
  messageCount: number;
  lastVisitorActivity: string; // "5 minutes ago"
};

export function getConversationMeta(
  conversation: ConversationSelect,
  messages: RoleAwareMessage[]
): ConversationMeta;
```

**Update: `prompts/system.ts`**
Add new context section:
```markdown
## Current Context
Chatting with **{name}** from **{city}, {country}**.
Local time: **{visitorLocalTime}** ({greeting}).
Conversation: {messageCount} messages over {startedAgo}.
```

---

### Phase 2: SDK Tool Definitions

**New file: `tools/types.ts`**
```typescript
export type ToolContext = {
  websiteId: string;
  conversationId: string;
  visitorId: string;
  organizationId: string;
};
```

**New file: `tools/search-knowledge.ts`**
```typescript
import { tool } from "ai";
import { z } from "zod";

export const searchKnowledgeBase = tool({
  description: "Search knowledge base for help articles and FAQs",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
  }),
  execute: async ({ query }, { context }) => {
    const results = await vectorSearch(context.websiteId, query);
    return { articles: results.slice(0, 3) };
  },
});
```

**New file: `tools/set-title.ts`**
```typescript
import { tool } from "ai";
import { z } from "zod";

export const setConversationTitle = tool({
  description: "Set or update the conversation title. Use this early in the conversation to summarize the topic.",
  inputSchema: z.object({
    title: z.string().max(100).describe("Brief, descriptive title (max 100 chars)"),
  }),
  execute: async ({ title }, { context }) => {
    await updateTitle({ ...context, title });
    return { success: true, title };
  },
});
```

**New file: `tools/update-sentiment.ts`**
```typescript
import { tool } from "ai";
import { z } from "zod";

export const updateSentiment = tool({
  description: "Update conversation sentiment when the visitor's tone changes. Call this when you notice frustration, satisfaction, or other emotional shifts.",
  inputSchema: z.object({
    sentiment: z.enum(["positive", "neutral", "negative"]).describe("Current sentiment"),
    reason: z.string().describe("Brief reason for the sentiment assessment"),
  }),
  execute: async ({ sentiment, reason }, { context }) => {
    await updateSentimentAction({ ...context, sentiment, confidence: 0.9 });
    return { success: true, sentiment, reason };
  },
});
```

**New file: `tools/set-priority.ts`**
```typescript
import { tool } from "ai";
import { z } from "zod";

export const setPriority = tool({
  description: "Set conversation priority based on urgency. Use 'urgent' for time-sensitive issues, 'high' for important matters.",
  inputSchema: z.object({
    priority: z.enum(["low", "normal", "high", "urgent"]).describe("Priority level"),
    reason: z.string().describe("Brief reason for priority level"),
  }),
  execute: async ({ priority, reason }, { context }) => {
    await updatePriority({ ...context, newPriority: priority });
    return { success: true, priority, reason };
  },
});
```

**Update: `tools/index.ts`**
```typescript
export function getToolsForGeneration(
  aiAgent: AiAgentSelect,
  context: ToolContext
): Record<string, Tool> | undefined {
  const tools: Record<string, Tool> = {};
  
  // Context-gathering tools
  if (hasKnowledgeBase(aiAgent)) {
    tools.searchKnowledgeBase = searchKnowledgeBase;
  }
  
  // Side-effect tools (always available based on settings)
  tools.setConversationTitle = setConversationTitle;
  
  if (settings.autoAnalyzeSentiment) {
    tools.updateSentiment = updateSentiment;
  }
  
  if (settings.canSetPriority) {
    tools.setPriority = setPriority;
  }
  
  return Object.keys(tools).length > 0 ? tools : undefined;
}
```

---

### Phase 3: Update Generation Step

**Update: `pipeline/3-generation.ts`**

```typescript
// Build tool context
const toolContext: ToolContext = {
  websiteId,
  conversationId: conversation.id,
  visitorId,
  organizationId,
};

// Get tools
const tools = getToolsForGeneration(aiAgent, toolContext);

// Generate with tools + structured output
const result = await generateText({
  model: openrouter.chat(aiAgent.model),
  output: Output.object({ schema: aiDecisionSchema }),
  tools,
  experimental_context: toolContext,
  stopWhen: tools ? stepCountIs(5) : undefined,
  system: systemPrompt,
  messages,
  temperature: aiAgent.temperature ?? 0.7,
});
```

---

### Phase 4: Tool Description in Prompts

**Update: `prompts/templates.ts`**

```typescript
TOOLS_AVAILABLE: `## Available Tools

You can use these tools to gather information:

{toolList}

**Usage:**
- Call tools when you need additional context
- After using tools, provide your final decision
- Don't call tools unnecessarily
`,
```

**Update: `prompts/system.ts`**
```typescript
// Add tool descriptions if tools are available
if (tools && Object.keys(tools).length > 0) {
  const toolList = Object.entries(tools)
    .map(([name, t]) => `- **${name}**: ${t.description}`)
    .join("\n");
  parts.push(PROMPT_TEMPLATES.TOOLS_AVAILABLE.replace("{toolList}", toolList));
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `context/temporal.ts` | CREATE | Time/date context |
| `context/conversation-meta.ts` | CREATE | Conversation stats |
| `tools/types.ts` | CREATE | Tool context types |
| `tools/search-knowledge.ts` | CREATE | Knowledge base tool |
| `tools/set-title.ts` | CREATE | Set conversation title |
| `tools/update-sentiment.ts` | CREATE | Update sentiment inline |
| `tools/set-priority.ts` | CREATE | Set priority level |
| `tools/index.ts` | UPDATE | Enable tools |
| `prompts/templates.ts` | UPDATE | Add tool template |
| `prompts/system.ts` | UPDATE | Add context + tools |
| `pipeline/3-generation.ts` | UPDATE | Pass tool context |
| `pipeline/5-followup.ts` | UPDATE | Skip separate LLM calls if tools used |

---

## Key Principles

1. **Tools gather, schema decides** - Tools fetch context, structured output makes decisions
2. **Never go silent** - Maintained via `aiDecisionSchema.visitorMessage` requirement
3. **Opt-in tools** - Tools only enabled when configured
4. **Future-ready** - Architecture supports user-defined tools

---

## Future: User-Defined Tools

Users will create custom tools via dashboard:

```typescript
// Stored in database
{
  id: "tool_xxx",
  aiAgentId: "agent_xxx",
  name: "getOrderStatus",
  description: "Check order status",
  inputSchema: { orderId: "string" },
  endpoint: "https://api.customer.com/orders/{orderId}",
  authHeader: "Bearer xxx",
}
```

Loaded at runtime:
```typescript
const customTools = await loadCustomTools(aiAgent.id);
Object.assign(tools, customTools);
```
