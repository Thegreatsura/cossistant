import type { Database } from "@api/db";
import { sendMessages } from "@api/db/queries/message";
import { routeEvent } from "@api/ws/router";
import {
	sendEventToConnection,
	sendEventToVisitor,
	sendEventToWebsite,
} from "@api/ws/socket";
import type {
	Message,
	MessageType,
	MessageVisibility,
} from "@cossistant/types";
import {
	MessageType as MessageTypeValues,
	MessageVisibility as MessageVisibilityValues,
	messageSchema,
} from "@cossistant/types";
import type {
	RealtimeEvent,
	RealtimeEventData,
} from "@cossistant/types/realtime-events";

export function prepareMessageForInsert(bodyMd: string) {
	const normalized = bodyMd.normalize("NFC");

	return { bodyMd: normalized };
}

export type CreateMessageOptions = {
	db: Database;
	organizationId: string;
	websiteId: string;
	conversationId: string;
	conversationVisitorId?: string | null;
	message: {
		bodyMd: string;
		type?: MessageType;
		userId?: string | null;
		aiAgentId?: string | null;
		visitorId?: string | null;
		visibility?: MessageVisibility;
		createdAt?: Date;
	};
};

function serializeMessageForRealtime(
	message: Message,
	context: {
		conversationId: string;
		websiteId: string;
		organizationId: string;
	}
): RealtimeEventData<"MESSAGE_CREATED"> {
	return {
		message: {
			id: message.id,
			bodyMd: message.bodyMd,
			type: message.type,
			userId: message.userId,
			aiAgentId: message.aiAgentId,
			visitorId: message.visitorId,
			organizationId: context.organizationId,
			websiteId: context.websiteId,
			conversationId: message.conversationId,
			parentMessageId: message.parentMessageId,
			modelUsed: message.modelUsed,
			createdAt: message.createdAt.toISOString(),
			updatedAt: message.updatedAt.toISOString(),
			deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
			visibility: message.visibility,
		},
		conversationId: context.conversationId,
		websiteId: context.websiteId,
		organizationId: context.organizationId,
	};
}

export async function createMessage(
	options: CreateMessageOptions
): Promise<Message> {
	const { db, organizationId, websiteId, conversationId, message } = options;

	const normalizedBody = prepareMessageForInsert(message.bodyMd);

	const [createdMessage] = await sendMessages(db, {
		organizationId,
		websiteId,
		conversationId,
		messages: [
			{
				bodyMd: normalizedBody.bodyMd,
				type: message.type ?? MessageTypeValues.TEXT,
				userId: message.userId ?? null,
				aiAgentId: message.aiAgentId ?? null,
				visitorId: message.visitorId ?? null,
				conversationId,
				createdAt: message.createdAt ?? new Date(),
				visibility: message.visibility ?? MessageVisibilityValues.PUBLIC,
			},
		],
	});

	const parsedMessage = messageSchema.parse(createdMessage);

	const realtimePayload = serializeMessageForRealtime(parsedMessage, {
		conversationId,
		websiteId,
		organizationId,
	});

	const event: RealtimeEvent<"MESSAGE_CREATED"> = {
		type: "MESSAGE_CREATED",
		data: realtimePayload,
		timestamp: Date.now(),
	};

	let targetVisitorId =
		options.conversationVisitorId ??
		realtimePayload.message.visitorId ??
		undefined;

	if (!targetVisitorId) {
		targetVisitorId = await resolveConversationVisitorId(
			options.db,
			conversationId
		);
	}

	await routeEvent(event, {
		connectionId: "server",
		websiteId,
		visitorId: targetVisitorId,
		organizationId,
		sendToConnection: sendEventToConnection,
		sendToVisitor: sendEventToVisitor,
		sendToWebsite: sendEventToWebsite,
	});

	return parsedMessage;
}

type GetConversationByIdFn =
	typeof import("@api/db/queries/conversation")["getConversationById"];

let getConversationByIdCached: GetConversationByIdFn | null = null;

async function resolveConversationVisitorId(
	db: Database,
	conversationId: string
): Promise<string | undefined> {
	try {
		if (!getConversationByIdCached) {
			const module = await import("@api/db/queries/conversation");
			getConversationByIdCached = module.getConversationById;
		}

		const conversationRecord = await getConversationByIdCached?.(db, {
			conversationId,
		});

		return conversationRecord?.visitorId ?? undefined;
	} catch (error) {
		console.error("[MESSAGE_CREATED] Failed to resolve conversation visitor", {
			error,
			conversationId,
		});
		return;
	}
}
