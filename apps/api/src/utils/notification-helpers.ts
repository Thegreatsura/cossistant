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
import {
	ConversationParticipationStatus,
	MemberNotificationChannel,
} from "@cossistant/types";
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
					ConversationParticipationStatus.ACTIVE
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
 * and excludes messages authored by the recipient themselves
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

	// Build base conditions for messages
	const baseConditions = [
		eq(conversationTimelineItem.conversationId, params.conversationId),
		eq(conversationTimelineItem.organizationId, params.organizationId),
		eq(conversationTimelineItem.type, "message"),
		eq(conversationTimelineItem.visibility, "public"),
		isNull(conversationTimelineItem.deletedAt),
	];

	// Add lastSeenAt filter if we have a seen record
	if (seenRecord?.lastSeenAt) {
		baseConditions.push(
			gt(conversationTimelineItem.createdAt, seenRecord.lastSeenAt)
		);
	}

	// Exclude messages authored by the recipient
	if (params.recipientUserId) {
		baseConditions.push(
			ne(conversationTimelineItem.userId, params.recipientUserId)
		);
	} else if (params.recipientVisitorId) {
		baseConditions.push(
			ne(conversationTimelineItem.visitorId, params.recipientVisitorId)
		);
	}

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
		.where(and(...baseConditions))
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
					id:
						message.userId ||
						message.visitorId ||
						message.aiAgentId ||
						"unknown",
					name: senderName,
					image: senderImage,
				},
			};
		})
	);

	return {
		messages: enrichedMessages.reverse(), // Reverse to show oldest first, newest last
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

/**
 * Check if visitor has email notifications enabled
 * Checks contact.notificationSettings JSONB field
 * Returns true if enabled or if no preference is set (default to enabled)
 */
export async function isVisitorEmailNotificationEnabled(
	db: Database,
	params: {
		visitorId: string;
		websiteId: string;
	}
): Promise<boolean> {
	const [result] = await db
		.select({
			contactId: visitor.contactId,
		})
		.from(visitor)
		.where(
			and(
				eq(visitor.id, params.visitorId),
				eq(visitor.websiteId, params.websiteId)
			)
		)
		.limit(1);

	if (!result?.contactId) {
		// No contact associated, default to enabled
		return true;
	}

	const [contactInfo] = await db
		.select({
			notificationSettings: contact.notificationSettings,
		})
		.from(contact)
		.where(eq(contact.id, result.contactId))
		.limit(1);

	// If no notification settings, default to enabled
	if (!contactInfo?.notificationSettings) {
		return true;
	}

	// Check if emailNotifications is explicitly disabled
	const settings = contactInfo.notificationSettings as {
		emailNotifications?: boolean;
	};

	// Default to true if not explicitly set to false
	return settings.emailNotifications !== false;
}
