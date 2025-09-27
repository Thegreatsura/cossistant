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

/**
 * Event handlers for each realtime event type
 * Each handler receives context, the full event payload, and forwards it to
 * relevant local connections using the provided dispatch helpers.
 */
const eventHandlers: EventHandlers = {
	USER_CONNECTED: (ctx, event) => {
		const data = event.data;
		console.log(`[USER_CONNECTED] User ${data.userId} connected`, {
			connectionId: data.connectionId,
			timestamp: new Date(data.timestamp).toISOString(),
			contextConnectionId: ctx.connectionId,
			websiteId: ctx.websiteId,
		});

		if (ctx.websiteId) {
			ctx.sendToWebsite?.(ctx.websiteId, event, {
				exclude: ctx.connectionId,
			});
		}
	},

	USER_DISCONNECTED: (ctx, event) => {
		const data = event.data;
		console.log(`[USER_DISCONNECTED] User ${data.userId} disconnected`, {
			connectionId: data.connectionId,
			timestamp: new Date(data.timestamp).toISOString(),
			contextConnectionId: ctx.connectionId,
			websiteId: ctx.websiteId,
		});

		if (ctx.websiteId) {
			ctx.sendToWebsite?.(ctx.websiteId, event, {
				exclude: ctx.connectionId,
			});
		}
	},

	VISITOR_CONNECTED: (ctx, event) => {
		const data = event.data;
		console.log(`[VISITOR_CONNECTED] Visitor ${data.visitorId} connected`, {
			connectionId: data.connectionId,
			timestamp: new Date(data.timestamp).toISOString(),
			contextConnectionId: ctx.connectionId,
			websiteId: ctx.websiteId,
		});

		if (ctx.websiteId) {
			ctx.sendToWebsite?.(ctx.websiteId, event);
		}
	},

	VISITOR_DISCONNECTED: (ctx, event) => {
		const data = event.data;
		console.log(
			`[VISITOR_DISCONNECTED] Visitor ${data.visitorId} disconnected`,
			{
				connectionId: data.connectionId,
				timestamp: new Date(data.timestamp).toISOString(),
				contextConnectionId: ctx.connectionId,
				websiteId: ctx.websiteId,
			}
		);

		if (ctx.websiteId) {
			ctx.sendToWebsite?.(ctx.websiteId, event);
		}
	},

	USER_PRESENCE_UPDATE: (ctx, event) => {
		const data = event.data;
		console.log(
			`[USER_PRESENCE_UPDATE] User ${data.userId} status: ${data.status}`,
			{
				lastSeen: new Date(data.lastSeen).toISOString(),
				contextConnectionId: ctx.connectionId,
				websiteId: ctx.websiteId,
			}
		);

		if (ctx.websiteId) {
			ctx.sendToWebsite?.(ctx.websiteId, event, {
				exclude: ctx.connectionId,
			});
		}
	},

	MESSAGE_CREATED: (ctx, event) => {
		const data = event.data;
		console.log(
			`[MESSAGE_CREATED] Message ${data.message.id} created for conversation ${data.conversationId}`,
			{
				websiteId: data.websiteId,
				organizationId: data.organizationId,
			}
		);

		const websiteId = data.websiteId ?? ctx.websiteId;
		if (websiteId) {
			ctx.sendToWebsite?.(websiteId, event);
		}

		const visitorId = data.message.visitorId ?? ctx.visitorId;
		if (visitorId) {
			ctx.sendToVisitor?.(visitorId, event);
		}
	},

	CONVERSATION_SEEN: (ctx, event) => {
		const data = event.data;
		console.log(
			`[CONVERSATION_SEEN] Conversation ${data.conversationId} seen by ${data.actorType}`,
			{
				actorId: data.actorId,
				websiteId: data.websiteId,
				conversationVisitorId: data.conversationVisitorId,
			}
		);

		const websiteId = data.websiteId ?? ctx.websiteId;
		if (websiteId) {
			ctx.sendToWebsite?.(websiteId, event);
		}

		const visitorTargets = new Set<string>();
		if (data.conversationVisitorId) {
			visitorTargets.add(data.conversationVisitorId);
		}
		if (data.visitorId) {
			visitorTargets.add(data.visitorId);
		}
		if (ctx.visitorId) {
			visitorTargets.add(ctx.visitorId);
		}

		for (const visitorId of visitorTargets) {
			ctx.sendToVisitor?.(visitorId, event);
		}
	},

	CONVERSATION_TYPING: (ctx, event) => {
		const data = event.data;
		console.log(
			`[CONVERSATION_TYPING] Conversation ${data.conversationId} actor ${data.actorType} typing=${data.isTyping}`,
			{
				actorId: data.actorId,
				websiteId: data.websiteId,
			}
		);

		const websiteId = data.websiteId ?? ctx.websiteId;
		if (websiteId) {
			ctx.sendToWebsite?.(websiteId, event);
		}

		const visitorTargets = new Set<string>();
		if (data.conversationVisitorId) {
			visitorTargets.add(data.conversationVisitorId);
		}
		if (data.visitorId) {
			visitorTargets.add(data.visitorId);
		}
		if (ctx.visitorId) {
			visitorTargets.add(ctx.visitorId);
		}

		for (const visitorId of visitorTargets) {
			ctx.sendToVisitor?.(visitorId, event);
		}
	},

	CONVERSATION_EVENT_CREATED: (ctx, event) => {
		const data = event.data;
		console.log(
			`[CONVERSATION_EVENT_CREATED] Event ${data.event.id} for conversation ${data.conversationId}`,
			{
				websiteId: data.websiteId,
				organizationId: data.organizationId,
				type: data.event.type,
			}
		);

		const websiteId = data.websiteId ?? ctx.websiteId;
		if (websiteId) {
			ctx.sendToWebsite?.(websiteId, event);
		}

		const visitorTargets = new Set<string>();
		if (data.conversationVisitorId) {
			visitorTargets.add(data.conversationVisitorId);
		}
		if (ctx.visitorId) {
			visitorTargets.add(ctx.visitorId);
		}

		for (const visitorId of visitorTargets) {
			ctx.sendToVisitor?.(visitorId, event);
		}
	},

	CONVERSATION_CREATED: (ctx, event) => {
		const data = event.data;
		console.log(
			`[CONVERSATION_CREATED] Conversation ${data.conversation.id} created`,
			{
				websiteId: data.websiteId,
				organizationId: data.organizationId,
				visitorId: data.visitorId,
			}
		);

		const websiteId = data.websiteId ?? ctx.websiteId;
		if (websiteId) {
			ctx.sendToWebsite?.(websiteId, event);
		}

		if (data.visitorId) {
			ctx.sendToVisitor?.(data.visitorId, event);
		}
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
}

export type {
	ConnectionDispatcher,
	DispatchOptions,
	EventContext,
	EventHandler,
	VisitorDispatcher,
	WebsiteDispatcher,
};
