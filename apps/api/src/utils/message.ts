import type { Database } from "@api/db";
import { sendMessages } from "@api/db/queries/message";
import { emitToAll } from "@api/lib/pubsub";
import {
        MessageType as MessageTypeValues,
        MessageVisibility as MessageVisibilityValues,
        messageSchema,
} from "@cossistant/types";
import type {
        Message,
        MessageType as MessageType,
        MessageVisibility as MessageVisibility,
} from "@cossistant/types";
import type { RealtimeEventData } from "@cossistant/types/realtime-events";

export function prepareMessageForInsert(bodyMd: string) {
        const normalized = bodyMd.normalize("NFC");

        return { bodyMd: normalized };
}

export interface CreateMessageOptions {
        db: Database;
        organizationId: string;
        websiteId: string;
        conversationId: string;
        message: {
                bodyMd: string;
                type?: MessageType;
                userId?: string | null;
                aiAgentId?: string | null;
                visitorId?: string | null;
                visibility?: MessageVisibility;
                createdAt?: Date;
        };
}

function serializeMessageForRealtime(
        message: Message,
        context: {
                conversationId: string;
                websiteId: string;
                organizationId: string;
        },
): RealtimeEventData<"MESSAGE_CREATED"> {
        return {
                message: {
                        id: message.id,
                        bodyMd: message.bodyMd,
                        type: message.type,
                        userId: message.userId,
                        aiAgentId: message.aiAgentId,
                        visitorId: message.visitorId,
                        conversationId: message.conversationId,
                        createdAt: message.createdAt.toISOString(),
                        updatedAt: message.updatedAt.toISOString(),
                        deletedAt: message.deletedAt
                                ? message.deletedAt.toISOString()
                                : null,
                        visibility: message.visibility,
                },
                conversationId: context.conversationId,
                websiteId: context.websiteId,
                organizationId: context.organizationId,
        };
}

export async function createMessage(options: CreateMessageOptions): Promise<Message> {
        const {
                db,
                organizationId,
                websiteId,
                conversationId,
                message,
        } = options;

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
                                visibility:
                                        message.visibility ?? MessageVisibilityValues.PUBLIC,
                        },
                ],
        });

        const parsedMessage = messageSchema.parse(createdMessage);

        await emitToAll(
                conversationId,
                websiteId,
                "MESSAGE_CREATED",
                serializeMessageForRealtime(parsedMessage, {
                        conversationId,
                        websiteId,
                        organizationId,
                }),
        );

        return parsedMessage;
}
