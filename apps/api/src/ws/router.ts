import type {
  RealtimeEvent,
  RealtimeEventType,
} from "@cossistant/types/realtime-events";

type DispatchOptions = {
  exclude?: string | string[];
};

type ConnectionDispatcher = (
  connectionId: string,
  event: RealtimeEvent
) => void;

type VisitorDispatcher = (
  visitorId: string,
  event: RealtimeEvent,
  options?: DispatchOptions
) => void;

type WebsiteDispatcher = (
  websiteId: string,
  event: RealtimeEvent,
  options?: DispatchOptions
) => void;

type EventContext = {
  connectionId: string;
  userId?: string;
  visitorId?: string;
  websiteId?: string;
  organizationId?: string;
  ws?: WebSocket;
  sendToConnection?: ConnectionDispatcher;
  sendToVisitor?: VisitorDispatcher;
  sendToWebsite?: WebsiteDispatcher;
};

type EventHandler<T extends RealtimeEventType> = (
  ctx: EventContext,
  event: RealtimeEvent<T>
) => Promise<void> | void;

type EventHandlers = {
  [K in RealtimeEventType]: EventHandler<K>;
};

type WebsiteDispatchRule = boolean | { excludeConnection?: boolean };

type DispatchRule = {
  website: WebsiteDispatchRule;
  visitor: boolean;
};

type DispatchRuleOverrides = Partial<DispatchRule>;

const DEFAULT_DISPATCH_RULE: DispatchRule = {
  website: true,
  visitor: true,
};

const dispatchRules: Partial<Record<RealtimeEventType, DispatchRuleOverrides>> =
  {
    USER_CONNECTED: { website: { excludeConnection: true }, visitor: false },
    USER_DISCONNECTED: { website: { excludeConnection: true }, visitor: false },
    USER_PRESENCE_UPDATE: {
      website: { excludeConnection: true },
      visitor: false,
    },
    VISITOR_CONNECTED: { website: true, visitor: false },
    VISITOR_DISCONNECTED: { website: true, visitor: false },
    CONVERSATION_EVENT_CREATED: { website: true, visitor: true },
    CONVERSATION_CREATED: { website: true, visitor: true },
    CONVERSATION_SEEN: { website: true, visitor: true },
    CONVERSATION_TYPING: { website: true, visitor: true },
    MESSAGE_CREATED: { website: true, visitor: true },
  };

function resolveWebsiteDispatchOptions(
  rule: WebsiteDispatchRule | undefined,
  ctx: EventContext
): DispatchOptions | undefined {
  if (!rule) {
    return;
  }

  if (typeof rule === "boolean") {
    return;
  }

  if (rule.excludeConnection && ctx.connectionId) {
    return { exclude: ctx.connectionId } satisfies DispatchOptions;
  }

  return;
}

function dispatchEvent(
  ctx: EventContext,
  event: RealtimeEvent,
  rules: DispatchRule
): void {
  const websiteTarget = event.websiteId ?? ctx.websiteId;
  if (websiteTarget && ctx.sendToWebsite && rules.website) {
    const options = resolveWebsiteDispatchOptions(rules.website, ctx);
    ctx.sendToWebsite(websiteTarget, event, options);
  }

  if (rules.visitor && event.visitorId && ctx.sendToVisitor) {
    ctx.sendToVisitor(event.visitorId, event);
  }
}

/**
 * Event handlers for each realtime event type
 * Each handler receives context, the full event payload, and forwards it to
 * relevant local connections using the provided dispatch helpers.
 */
const eventHandlers: EventHandlers = {
  USER_CONNECTED: (ctx, event) => {
    const data = event.payload;
    console.log(`[USER_CONNECTED] User ${data.userId} connected`, {
      connectionId: data.connectionId,
      timestamp: new Date(data.timestamp).toISOString(),
      contextConnectionId: ctx.connectionId,
      websiteId: event.websiteId,
    });
  },

  USER_DISCONNECTED: (ctx, event) => {
    const data = event.payload;
    console.log(`[USER_DISCONNECTED] User ${data.userId} disconnected`, {
      connectionId: data.connectionId,
      timestamp: new Date(data.timestamp).toISOString(),
      contextConnectionId: ctx.connectionId,
      websiteId: event.websiteId,
    });
  },

  VISITOR_CONNECTED: (ctx, event) => {
    const data = event.payload;
    console.log(`[VISITOR_CONNECTED] Visitor ${data.visitorId} connected`, {
      connectionId: data.connectionId,
      timestamp: new Date(data.timestamp).toISOString(),
      contextConnectionId: ctx.connectionId,
      websiteId: event.websiteId,
    });
  },

  VISITOR_DISCONNECTED: (ctx, event) => {
    const data = event.payload;
    console.log(
      `[VISITOR_DISCONNECTED] Visitor ${data.visitorId} disconnected`,
      {
        connectionId: data.connectionId,
        timestamp: new Date(data.timestamp).toISOString(),
        contextConnectionId: ctx.connectionId,
        websiteId: event.websiteId,
      }
    );
  },

  USER_PRESENCE_UPDATE: (ctx, event) => {
    const data = event.payload;
    console.log(
      `[USER_PRESENCE_UPDATE] User ${data.userId} status: ${data.status}`,
      {
        lastSeen: new Date(data.lastSeen).toISOString(),
        contextConnectionId: ctx.connectionId,
        websiteId: event.websiteId,
      }
    );
  },

  MESSAGE_CREATED: (_ctx, event) => {
    const data = event.payload;
    console.log(
      `[MESSAGE_CREATED] Message ${data.message.id} created for conversation ${data.conversationId}`,
      {
        websiteId: event.websiteId,
        organizationId: event.organizationId,
      }
    );
  },

  CONVERSATION_SEEN: (_ctx, event) => {
    const data = event.payload;
    const actorType = data.userId
      ? "user"
      : data.visitorId
        ? "visitor"
        : data.aiAgentId
          ? "aiAgent"
          : "unknown";
    const actorId = data.userId ?? data.visitorId ?? data.aiAgentId ?? null;

    console.log(
      `[CONVERSATION_SEEN] Conversation ${data.conversationId} seen by ${actorType}`,
      {
        actorId,
        websiteId: event.websiteId,
      }
    );
  },

  CONVERSATION_TYPING: (_ctx, event) => {
    const data = event.payload;
    const actorType = data.userId
      ? "user"
      : data.visitorId
        ? "visitor"
        : data.aiAgentId
          ? "aiAgent"
          : "unknown";
    const actorId = data.userId ?? data.visitorId ?? data.aiAgentId ?? null;

    console.log(
      `[CONVERSATION_TYPING] Conversation ${data.conversationId} actor ${actorType} typing=${data.isTyping}`,
      {
        actorId,
        websiteId: event.websiteId,
      }
    );
  },

  CONVERSATION_EVENT_CREATED: (_ctx, event) => {
    const data = event.payload;
    console.log(
      `[CONVERSATION_EVENT_CREATED] Event ${data.event.id} for conversation ${data.conversationId}`,
      {
        websiteId: event.websiteId,
        organizationId: event.organizationId,
        type: data.event.type,
      }
    );
  },

  CONVERSATION_CREATED: (_ctx, event) => {
    const data = event.payload;
    console.log(
      `[CONVERSATION_CREATED] Conversation ${data.conversationId} created`,
      {
        websiteId: event.websiteId,
        organizationId: event.organizationId,
        visitorId: data.visitorId,
      }
    );
  },
};

/**
 * Routes an event to its appropriate handler
 */
export async function routeEvent<T extends RealtimeEventType>(
  event: RealtimeEvent<T>,
  context: EventContext
): Promise<void> {
  const handler = eventHandlers[event.type] as EventHandler<T>;

  if (!handler) {
    console.error(
      `[EventRouter] No handler found for event type: ${event.type}`
    );
    return;
  }

  try {
    await handler(context, event);
  } catch (error) {
    console.error(`[EventRouter] Error handling ${event.type}:`, error);
  }

  const overrides = dispatchRules[event.type];
  const rules: DispatchRule = {
    website: overrides?.website ?? DEFAULT_DISPATCH_RULE.website,
    visitor: overrides?.visitor ?? DEFAULT_DISPATCH_RULE.visitor,
  };

  dispatchEvent(context, event, rules);
}

export type {
  ConnectionDispatcher,
  DispatchOptions,
  EventContext,
  EventHandler,
  VisitorDispatcher,
  WebsiteDispatcher,
};
