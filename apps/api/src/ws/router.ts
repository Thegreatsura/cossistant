import { markUserPresence, markVisitorPresence } from "@api/services/presence";
import type {
	AnyRealtimeEvent,
	RealtimeEvent,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";

type DispatchOptions = {
	exclude?: string | string[];
};

type ConnectionDispatcher = (
	connectionId: string,
	event: AnyRealtimeEvent
) => void;

type VisitorDispatcher = (
	visitorId: string,
	event: AnyRealtimeEvent,
	options?: DispatchOptions
) => void;

type WebsiteDispatcher = (
	websiteId: string,
	event: AnyRealtimeEvent,
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
		userConnected: { website: { excludeConnection: true }, visitor: false },
		userDisconnected: { website: { excludeConnection: true }, visitor: false },
		userPresenceUpdate: {
			website: { excludeConnection: true },
			visitor: false,
		},
		visitorConnected: { website: true, visitor: false },
		visitorDisconnected: { website: true, visitor: false },
		conversationEventCreated: { website: true, visitor: true },
		conversationCreated: { website: true, visitor: true },
		conversationSeen: { website: true, visitor: true },
		conversationTyping: { website: true, visitor: true },
		timelineItemCreated: { website: true, visitor: true },
		visitorIdentified: { website: true, visitor: true },
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

function dispatchEvent<T extends RealtimeEventType>(
	ctx: EventContext,
	event: RealtimeEvent<T>,
	rules: DispatchRule
): void {
	const websiteTarget = event.payload.websiteId ?? ctx.websiteId;
	if (websiteTarget && ctx.sendToWebsite && rules.website) {
		const options = resolveWebsiteDispatchOptions(rules.website, ctx);
		ctx.sendToWebsite(websiteTarget, event as AnyRealtimeEvent, options);
	}

	if (rules.visitor && event.payload.visitorId && ctx.sendToVisitor) {
		ctx.sendToVisitor(event.payload.visitorId, event as AnyRealtimeEvent);
	}
}

/**
 * Event handlers for each realtime event type
 * Each handler receives context, the full event payload, and forwards it to
 * relevant local connections using the provided dispatch helpers.
 */
const eventHandlers: EventHandlers = {
	userConnected: async (_ctx, event) => {
		const data = event.payload;
		const lastSeenAt = new Date().toISOString();

		if (!data.userId) {
			return;
		}

		void markUserPresence({
			websiteId: data.websiteId,
			userId: data.userId,
			lastSeenAt,
		});
	},

	userDisconnected: async (_ctx, event) => {
		const data = event.payload;
		const lastSeenAt = new Date().toISOString();

		if (!data.userId) {
			return;
		}

		void markUserPresence({
			websiteId: data.websiteId,
			userId: data.userId,
			lastSeenAt,
		});
	},

	visitorConnected: async (_ctx, event) => {
		const data = event.payload;
		const lastSeenAt = new Date().toISOString();

		void markVisitorPresence({
			websiteId: data.websiteId,
			visitorId: data.visitorId,
			lastSeenAt,
		});
	},

	visitorDisconnected: async (_ctx, event) => {
		const data = event.payload;
		const lastSeenAt = new Date().toISOString();

		void markVisitorPresence({
			websiteId: data.websiteId,
			visitorId: data.visitorId,
			lastSeenAt,
		});
	},

	userPresenceUpdate: (ctx, event) => {
		const data = event.payload;
	},

	timelineItemCreated: (_ctx, event) => {
		const data = event.payload;
	},

	conversationSeen: (_ctx, event) => {
		const data = event.payload;
		const actorType = data.userId
			? "user"
			: data.visitorId
				? "visitor"
				: data.aiAgentId
					? "aiAgent"
					: "unknown";
		const actorId = data.userId ?? data.visitorId ?? data.aiAgentId ?? null;
	},

	conversationTyping: (_ctx, event) => {
		const data = event.payload;
		const actorType = data.userId
			? "user"
			: data.visitorId
				? "visitor"
				: data.aiAgentId
					? "aiAgent"
					: "unknown";
		const actorId = data.userId ?? data.visitorId ?? data.aiAgentId ?? null;
	},

	conversationEventCreated: (_ctx, event) => {
		const data = event.payload;
	},

	conversationCreated: (_ctx, event) => {
		const data = event.payload;
	},
	visitorIdentified: (_ctx, event) => {
		const data = event.payload;
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
