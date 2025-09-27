import type { ConversationRecord } from "@api/db/mutations/conversation";
import type { conversationEvent } from "@api/db/schema";
import { routeEvent } from "@api/ws/router";
import {
	sendEventToConnection,
	sendEventToVisitor,
	sendEventToWebsite,
} from "@api/ws/socket";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type { InferSelectModel } from "drizzle-orm";

type ConversationEventRecord = InferSelectModel<typeof conversationEvent>;

export type ConversationRealtimeActor =
	| { type: "visitor"; visitorId: string }
	| { type: "user"; userId: string }
	| { type: "ai_agent"; aiAgentId: string };

type BaseRealtimeContext = {
	conversation: ConversationRecord;
};

type SeenEventParams = BaseRealtimeContext & {
	actor: ConversationRealtimeActor;
	lastSeenAt: Date;
};

type TypingEventParams = BaseRealtimeContext & {
	actor: ConversationRealtimeActor;
	isTyping: boolean;
};

type TimelineEventParams = BaseRealtimeContext & {
	event: ConversationEventRecord;
};

type ConversationCreatedEventParams = {
	conversation: ConversationRecord;
};

function mapActor(actor: ConversationRealtimeActor) {
	switch (actor.type) {
		case "visitor":
			return {
				actorType: "visitor" as const,
				actorId: actor.visitorId,
				visitorId: actor.visitorId,
				userId: null,
				aiAgentId: null,
			};
		case "user":
			return {
				actorType: "user" as const,
				actorId: actor.userId,
				visitorId: null,
				userId: actor.userId,
				aiAgentId: null,
			};
		case "ai_agent":
			return {
				actorType: "ai_agent" as const,
				actorId: actor.aiAgentId,
				visitorId: null,
				userId: null,
				aiAgentId: actor.aiAgentId,
			};
		default:
			throw new Error("Unknown actor type");
	}
}

export async function emitConversationSeenEvent({
	conversation,
	actor,
	lastSeenAt,
}: SeenEventParams) {
	const actorPayload = mapActor(actor);

	const event: RealtimeEvent<"CONVERSATION_SEEN"> = {
		type: "CONVERSATION_SEEN",
		data: {
			conversationId: conversation.id,
			websiteId: conversation.websiteId,
			organizationId: conversation.organizationId,
			lastSeenAt: lastSeenAt.toISOString(),
			...actorPayload,
		},
		timestamp: Date.now(),
	};

	await routeEvent(event, {
		connectionId: "server",
		organizationId: conversation.organizationId,
		websiteId: conversation.websiteId,
		userId: actorPayload.userId ?? undefined,
		visitorId: actorPayload.visitorId ?? undefined,
		sendToConnection: sendEventToConnection,
		sendToVisitor: sendEventToVisitor,
		sendToWebsite: sendEventToWebsite,
	});
}

export async function emitConversationTypingEvent({
	conversation,
	actor,
	isTyping,
}: TypingEventParams) {
	const actorPayload = mapActor(actor);

	const event: RealtimeEvent<"CONVERSATION_TYPING"> = {
		type: "CONVERSATION_TYPING",
		data: {
			conversationId: conversation.id,
			websiteId: conversation.websiteId,
			organizationId: conversation.organizationId,
			isTyping,
			...actorPayload,
		},
		timestamp: Date.now(),
	};

	await routeEvent(event, {
		connectionId: "server",
		organizationId: conversation.organizationId,
		websiteId: conversation.websiteId,
		userId: actorPayload.userId ?? undefined,
		visitorId: actorPayload.visitorId ?? undefined,
		sendToConnection: sendEventToConnection,
		sendToVisitor: sendEventToVisitor,
		sendToWebsite: sendEventToWebsite,
	});
}
