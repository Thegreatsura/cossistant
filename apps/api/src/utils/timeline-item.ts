import type { Database } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { conversationTimelineItem } from "@api/db/schema";
import { realtime } from "@api/realtime/emitter";
import { generateULID } from "@api/utils/db/ids";
import {
	ConversationTimelineType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { timelineItemSchema } from "@cossistant/types/api/timeline-item";
import type { RealtimeEventData } from "@cossistant/types/realtime-events";
import * as linkify from "linkifyjs";
import { triggerMessageNotificationWorkflow } from "./send-message-with-notification";

/**
 * Parses raw text and converts URLs to markdown link format
 * @param text - The raw text to parse
 * @returns The text with URLs converted to markdown links
 */
function parseTextToMarkdown(text: string): string {
	const matches = linkify.find(text);

	if (matches.length === 0) {
		return text;
	}

	let result = text;

	// Process matches in reverse to maintain correct positions
	for (let i = matches.length - 1; i >= 0; i--) {
		const match = matches[i];
		const markdownLink = `[${match.value}](${match.href})`;

		result =
			result.slice(0, match.start) + markdownLink + result.slice(match.end);
	}

	return result;
}

export type CreateTimelineItemOptions = {
	db: Database;
	organizationId: string;
	websiteId: string;
	conversationId: string;
	conversationOwnerVisitorId?: string | null;
	item: {
		id?: string;
		type:
			| typeof ConversationTimelineType.MESSAGE
			| typeof ConversationTimelineType.EVENT
			| typeof ConversationTimelineType.IDENTIFICATION;
		text?: string | null;
		parts: unknown[];
		userId?: string | null;
		aiAgentId?: string | null;
		visitorId?: string | null;
		visibility?:
			| typeof TimelineItemVisibility.PUBLIC
			| typeof TimelineItemVisibility.PRIVATE;
		createdAt?: Date;
		tool?: string | null;
	};
};

type TimelineItem = {
	id: string;
	conversationId: string;
	organizationId: string;
	visibility:
		| typeof TimelineItemVisibility.PUBLIC
		| typeof TimelineItemVisibility.PRIVATE;
	type:
		| typeof ConversationTimelineType.MESSAGE
		| typeof ConversationTimelineType.EVENT
		| typeof ConversationTimelineType.IDENTIFICATION;
	text: string | null;
	parts: unknown;
	userId: string | null;
	visitorId: string | null;
	aiAgentId: string | null;
	createdAt: string;
	deletedAt: string | null;
	tool: string | null;
};

export type MessageTimelineActor =
	| { type: "user"; userId: string }
	| { type: "visitor"; visitorId: string }
	| { type: "ai_agent"; aiAgentId: string };

export type CreateMessageTimelineItemOptions = {
	db: Database;
	organizationId: string;
	websiteId: string;
	conversationId: string;
	conversationOwnerVisitorId?: string | null;
	text: string; // Now required - the raw text content
	extraParts?: unknown[]; // Optional additional parts (images, files, events, etc.)
	id?: string; // Optional ID for the timeline item
	userId?: string | null;
	aiAgentId?: string | null;
	visitorId?: string | null;
	visibility?:
		| typeof TimelineItemVisibility.PUBLIC
		| typeof TimelineItemVisibility.PRIVATE;
	createdAt?: Date;
	tool?: string | null;
	triggerNotificationWorkflow?: boolean;
};

function serializeTimelineItemForRealtime(
	item: TimelineItem,
	context: {
		conversationId: string;
		websiteId: string;
		organizationId: string;
		userId: string | null;
		visitorId: string | null;
	}
): RealtimeEventData<"timelineItemCreated"> {
	return {
		item: {
			id: item.id,
			conversationId: item.conversationId,
			organizationId: item.organizationId,
			visibility: item.visibility,
			type: item.type,
			text: item.text,
			parts: item.parts as unknown[],
			userId: item.userId,
			visitorId: item.visitorId,
			aiAgentId: item.aiAgentId,
			createdAt: item.createdAt,
			deletedAt: item.deletedAt,
			tool: item.tool,
		},
		conversationId: context.conversationId,
		websiteId: context.websiteId,
		organizationId: context.organizationId,
		userId: context.userId,
		visitorId: context.visitorId,
	};
}

function resolveMessageActor(
	item: TimelineItem,
	fallbackVisitorId?: string | null
): MessageTimelineActor | null {
	if (item.userId) {
		return { type: "user", userId: item.userId };
	}

	if (item.aiAgentId) {
		return { type: "ai_agent", aiAgentId: item.aiAgentId };
	}

	if (item.visitorId) {
		return { type: "visitor", visitorId: item.visitorId };
	}

	if (fallbackVisitorId) {
		return { type: "visitor", visitorId: fallbackVisitorId };
	}

	return null;
}

export async function createMessageTimelineItem(
	options: CreateMessageTimelineItemOptions
): Promise<{ item: TimelineItem; actor: MessageTimelineActor | null }> {
	const {
		triggerNotificationWorkflow = true,
		conversationOwnerVisitorId,
		text,
		extraParts = [],
		id,
		db,
		organizationId,
		websiteId,
		conversationId,
		userId,
		aiAgentId,
		visitorId,
		visibility,
		createdAt,
		tool,
	} = options;

	// Parse the text to convert URLs to markdown links
	const parsedText = parseTextToMarkdown(text);

	// Construct the parts array with the text part first
	const parts = [{ type: "text", text: parsedText }, ...extraParts];

	const createdTimelineItem = await createTimelineItem({
		db,
		organizationId,
		websiteId,
		conversationId,
		conversationOwnerVisitorId,
		item: {
			id,
			type: ConversationTimelineType.MESSAGE,
			text: parsedText,
			parts,
			userId,
			aiAgentId,
			visitorId,
			visibility,
			createdAt,
			tool,
		},
	});

	const actor = resolveMessageActor(
		createdTimelineItem,
		conversationOwnerVisitorId ?? null
	);

	if (triggerNotificationWorkflow && actor) {
		triggerMessageNotificationWorkflow({
			conversationId,
			messageId: createdTimelineItem.id,
			websiteId,
			organizationId,
			actor,
		}).catch((error) => {
			console.error("[dev] Failed to trigger notification workflow:", error);
		});
	}

	return { item: createdTimelineItem, actor };
}

export async function createTimelineItem(
	options: CreateTimelineItemOptions
): Promise<TimelineItem> {
	const { db, organizationId, websiteId, conversationId, item } = options;

	const timelineItemId = item.id ?? generateULID();
	const createdAt = item.createdAt
		? item.createdAt.toISOString()
		: new Date().toISOString();

	const [createdItem] = await db
		.insert(conversationTimelineItem)
		.values({
			id: timelineItemId,
			conversationId,
			organizationId,
			visibility: item.visibility ?? TimelineItemVisibility.PUBLIC,
			type: item.type,
			text: item.text ?? null,
			parts: item.parts as unknown,
			userId: item.userId ?? null,
			visitorId: item.visitorId ?? null,
			aiAgentId: item.aiAgentId ?? null,
			createdAt,
			deletedAt: null,
		})
		.returning();

	const parsedItem = timelineItemSchema.parse({
		...createdItem,
		parts: createdItem.parts,
	});

	let visitorIdForEvent =
		options.conversationOwnerVisitorId ?? parsedItem.visitorId ?? null;

	if (!visitorIdForEvent) {
		visitorIdForEvent =
			(await resolveConversationVisitorId(options.db, conversationId)) ?? null;
	}

	if (!parsedItem.id) {
		throw new Error("Timeline item ID is required");
	}

	const realtimePayload = serializeTimelineItemForRealtime(
		{
			id: parsedItem.id,
			conversationId: parsedItem.conversationId,
			organizationId: parsedItem.organizationId,
			visibility: parsedItem.visibility,
			type: parsedItem.type,
			text: parsedItem.text ?? null,
			parts: parsedItem.parts,
			userId: parsedItem.userId,
			visitorId: parsedItem.visitorId,
			aiAgentId: parsedItem.aiAgentId,
			createdAt: parsedItem.createdAt,
			deletedAt: parsedItem.deletedAt ?? null,
			tool: parsedItem.tool ?? null,
		},
		{
			conversationId,
			websiteId,
			organizationId,
			userId: parsedItem.userId,
			visitorId: visitorIdForEvent,
		}
	);

	await realtime.emit("timelineItemCreated", realtimePayload);

	return {
		id: parsedItem.id,
		conversationId: parsedItem.conversationId,
		organizationId: parsedItem.organizationId,
		visibility: parsedItem.visibility,
		type: parsedItem.type,
		text: parsedItem.text ?? null,
		parts: parsedItem.parts,
		userId: parsedItem.userId,
		visitorId: parsedItem.visitorId,
		aiAgentId: parsedItem.aiAgentId,
		createdAt: parsedItem.createdAt,
		deletedAt: parsedItem.deletedAt ?? null,
		tool: parsedItem.tool ?? null,
	};
}

async function resolveConversationVisitorId(
	db: Database,
	conversationId: string
): Promise<string | undefined> {
	try {
		const conversationRecord = await getConversationById(db, {
			conversationId,
		});
		return conversationRecord?.visitorId ?? undefined;
	} catch (error) {
		console.error(
			"[TIMELINE_ITEM_CREATED] Failed to resolve conversation visitor",
			{
				error,
				conversationId,
			}
		);
		return;
	}
}
