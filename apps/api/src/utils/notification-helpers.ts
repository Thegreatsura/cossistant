import type { Database } from "@api/db";
import { getMemberNotificationSettings } from "@api/db/queries/member-notification-settings";
import {
	contact,
	conversationParticipant,
	conversationSeen,
	conversationTimelineItem,
	member,
	user,
	visitor,
	website,
} from "@api/db/schema";
import type { ConversationParticipationStatus } from "@cossistant/types";
import { MemberNotificationChannel } from "@cossistant/types";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";

/**
 * Get all active conversation participants except the sender
 */
export async function getConversationParticipantsForNotification(
	db: Database,
	params: {
		conversationId: string;
		organizationId: string;
		excludeUserId?: string;
	}
) {
	const participants = await db
		.select({
			userId: conversationParticipant.userId,
			memberId: member.id,
			userEmail: user.email,
			userName: user.name,
			userImage: user.image,
		})
		.from(conversationParticipant)
		.innerJoin(user, eq(conversationParticipant.userId, user.id))
		.innerJoin(
			member,
			and(
				eq(member.userId, user.id),
				eq(member.organizationId, params.organizationId)
			)
		)
		.where(
			and(
				eq(conversationParticipant.conversationId, params.conversationId),
				eq(conversationParticipant.organizationId, params.organizationId),
				eq(
					conversationParticipant.status,
					"ACTIVE" as ConversationParticipationStatus
				),
				isNull(conversationParticipant.leftAt),
				params.excludeUserId
					? ne(conversationParticipant.userId, params.excludeUserId)
					: undefined
			)
		);

	return participants;
}

/**
 * Get visitor email for notification
 */
export async function getVisitorEmailForNotification(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
	}
) {
	const [result] = await db
		.select({
			visitorId: visitor.id,
			contactId: contact.id,
			contactEmail: contact.email,
			contactName: contact.name,
			contactImage: contact.image,
		})
		.from(visitor)
		.leftJoin(contact, eq(visitor.contactId, contact.id))
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId),
				isNull(visitor.deletedAt),
				isNull(visitor.blockedAt)
			)
		)
		.limit(1);

	return result;
}

/**
 * Get member's notification preferences for email notifications
 */
export async function getMemberNotificationPreference(
	db: Database,
	params: {
		memberId: string;
		organizationId: string;
	}
) {
	const settings = await getMemberNotificationSettings(db, {
		memberId: params.memberId,
		organizationId: params.organizationId,
	});

	const emailNewMessageSetting = settings.settings.find(
		(s) => s.channel === MemberNotificationChannel.EMAIL_NEW_MESSAGE
	);

	return emailNewMessageSetting;
}

/**
 * Get unseen messages for a recipient in a conversation
 * Returns all messages that were created after the recipient's lastSeenAt timestamp
 */
export async function getUnseenMessagesForRecipient(
	db: Database,
	params: {
		conversationId: string;
		organizationId: string;
		recipientUserId?: string;
		recipientVisitorId?: string;
	}
) {
	// Get the recipient's last seen timestamp
	const seenWhere = params.recipientUserId
		? and(
				eq(conversationSeen.conversationId, params.conversationId),
				eq(conversationSeen.userId, params.recipientUserId)
			)
		: params.recipientVisitorId
			? and(
					eq(conversationSeen.conversationId, params.conversationId),
					eq(conversationSeen.visitorId, params.recipientVisitorId)
				)
			: undefined;

	if (!seenWhere) {
		throw new Error(
			"Either recipientUserId or recipientVisitorId must be provided"
		);
	}

	const [seenRecord] = await db
		.select({
			lastSeenAt: conversationSeen.lastSeenAt,
		})
		.from(conversationSeen)
		.where(seenWhere)
		.limit(1);

	// If no seen record exists, get all messages
	// If seen record exists, get messages created after lastSeenAt
	const messagesWhere = seenRecord?.lastSeenAt
		? and(
				eq(conversationTimelineItem.conversationId, params.conversationId),
				eq(conversationTimelineItem.organizationId, params.organizationId),
				gt(conversationTimelineItem.createdAt, seenRecord.lastSeenAt),
				eq(conversationTimelineItem.type, "message"),
				eq(conversationTimelineItem.visibility, "public"),
				isNull(conversationTimelineItem.deletedAt)
			)
		: and(
				eq(conversationTimelineItem.conversationId, params.conversationId),
				eq(conversationTimelineItem.organizationId, params.organizationId),
				eq(conversationTimelineItem.type, "message"),
				eq(conversationTimelineItem.visibility, "public"),
				isNull(conversationTimelineItem.deletedAt)
			);

	const messages = await db
		.select({
			id: conversationTimelineItem.id,
			text: conversationTimelineItem.text,
			createdAt: conversationTimelineItem.createdAt,
			userId: conversationTimelineItem.userId,
			visitorId: conversationTimelineItem.visitorId,
			aiAgentId: conversationTimelineItem.aiAgentId,
		})
		.from(conversationTimelineItem)
		.where(messagesWhere)
		.orderBy(desc(conversationTimelineItem.createdAt));

	return messages;
}

/**
 * Get messages for email with sender information
 * Fetches up to maxMessages with sender details (user or visitor name/image)
 */
export async function getMessagesForEmail(
	db: Database,
	params: {
		conversationId: string;
		organizationId: string;
		recipientUserId?: string;
		recipientVisitorId?: string;
		maxMessages?: number;
	}
) {
	const unseenMessages = await getUnseenMessagesForRecipient(db, {
		conversationId: params.conversationId,
		organizationId: params.organizationId,
		recipientUserId: params.recipientUserId,
		recipientVisitorId: params.recipientVisitorId,
	});

	if (unseenMessages.length === 0) {
		return { messages: [], totalCount: 0 };
	}

	const maxMessages = params.maxMessages ?? 3;
	const limitedMessages = unseenMessages.slice(0, maxMessages);

	// Enrich messages with sender information
	const enrichedMessages = await Promise.all(
		limitedMessages.map(async (message) => {
			let senderName = "Unknown";
			let senderImage: string | null = null;

			if (message.userId) {
				const [userInfo] = await db
					.select({
						name: user.name,
						image: user.image,
					})
					.from(user)
					.where(eq(user.id, message.userId))
					.limit(1);

				if (userInfo) {
					senderName = userInfo.name;
					senderImage = userInfo.image;
				}
			} else if (message.visitorId) {
				const [visitorInfo] = await db
					.select({
						contactName: contact.name,
						contactImage: contact.image,
					})
					.from(visitor)
					.leftJoin(contact, eq(visitor.contactId, contact.id))
					.where(eq(visitor.id, message.visitorId))
					.limit(1);

				if (visitorInfo?.contactName) {
					senderName = visitorInfo.contactName;
					senderImage = visitorInfo.contactImage;
				} else {
					senderName = "Visitor";
				}
			}

			return {
				text: message.text ?? "",
				createdAt: new Date(message.createdAt),
				sender: {
					name: senderName,
					image: senderImage,
				},
			};
		})
	);

	return {
		messages: enrichedMessages,
		totalCount: unseenMessages.length,
	};
}

/**
 * Get website information for email notification
 */
export async function getWebsiteForNotification(
	db: Database,
	params: {
		websiteId: string;
	}
) {
	const [websiteInfo] = await db
		.select({
			id: website.id,
			name: website.name,
			slug: website.slug,
			logo: website.logoUrl,
		})
		.from(website)
		.where(eq(website.id, params.websiteId))
		.limit(1);

	return websiteInfo;
}
