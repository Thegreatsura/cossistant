import type { ConversationRecord } from "@api/db/mutations/conversation";
import type { conversationEvent } from "@api/db/schema";
import { realtimeEmitter } from "@api/realtime/emitter";
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
	lastSeenAt: string;
};

type TypingEventParams = BaseRealtimeContext & {
	actor: ConversationRealtimeActor;
	isTyping: boolean;
	visitorPreview?: string | null;
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

	await realtimeEmitter.emit(
		"CONVERSATION_SEEN",
		{
			conversationId: conversation.id,
			websiteId: conversation.websiteId,
			organizationId: conversation.organizationId,
			lastSeenAt,
			...actorPayload,
		},
		{
			organizationId: conversation.organizationId,
			websiteId: conversation.websiteId,
			userId: actorPayload.userId,
			visitorId: actorPayload.visitorId ?? conversation.visitorId ?? null,
		}
	);
}

export async function emitConversationTypingEvent({
	conversation,
	actor,
	isTyping,
	visitorPreview,
}: TypingEventParams) {
	const actorPayload = mapActor(actor);
	const previewForEvent =
		actor.type === "visitor" && isTyping && visitorPreview
			? visitorPreview.slice(0, 2000)
			: null;

	await realtimeEmitter.emit(
		"CONVERSATION_TYPING",
		{
			conversationId: conversation.id,
			websiteId: conversation.websiteId,
			organizationId: conversation.organizationId,
			isTyping,
			visitorPreview: previewForEvent,
			...actorPayload,
		},
		{
			organizationId: conversation.organizationId,
			websiteId: conversation.websiteId,
			userId: actorPayload.userId,
			visitorId: actorPayload.visitorId ?? conversation.visitorId ?? null,
		}
	);
}
