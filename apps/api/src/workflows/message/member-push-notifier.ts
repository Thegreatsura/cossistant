import type { Database } from "@api/db";
import { getMemberNotificationSettings } from "@api/db/queries/member-notification-settings";
import {
	isValidPushSubscription,
	type PushSubscriptionData,
	sendPushNotification,
} from "@api/utils/web-push";
import { MemberNotificationChannel } from "@cossistant/types";

import type { MemberRecipient } from "./member-email-notifier";

export type SendMemberPushParams = {
	db: Database;
	recipient: MemberRecipient;
	conversationId: string;
	organizationId: string;
	websiteInfo: {
		name: string;
		slug: string;
		logo: string | null;
	};
	messagePreview: string;
	senderName: string;
};

/**
 * Get member's push notification preference and subscription
 */
async function getMemberPushPreference(
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

	const pushSetting = settings.settings.find(
		(s) => s.channel === MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE
	);

	return pushSetting;
}

/**
 * Send push notification to a team member
 * Handles preference checking and subscription validation
 */
export async function sendMemberPushNotification(
	params: SendMemberPushParams
): Promise<{ sent: boolean; reason?: string }> {
	const {
		db,
		recipient,
		conversationId,
		organizationId,
		websiteInfo,
		messagePreview,
		senderName,
	} = params;

	// Check member notification preferences
	const preference = await getMemberPushPreference(db, {
		memberId: recipient.memberId,
		organizationId,
	});

	// If preference is undefined or not enabled, skip
	if (!preference?.enabled) {
		return { sent: false, reason: "push_not_enabled" };
	}

	// Check if subscription exists in config
	const subscription = preference.config?.subscription;

	if (!isValidPushSubscription(subscription)) {
		return { sent: false, reason: "no_valid_subscription" };
	}

	// Truncate message preview if too long
	const truncatedPreview =
		messagePreview.length > 100
			? `${messagePreview.slice(0, 97)}...`
			: messagePreview;

	// Send push notification
	const result = await sendPushNotification(
		subscription as PushSubscriptionData,
		{
			title: `New message from ${senderName}`,
			body: truncatedPreview,
			icon: "/icon-192x192.png",
			badge: "/icon-192x192.png",
			tag: `conversation-${conversationId}`,
			data: {
				conversationId,
				websiteSlug: websiteInfo.slug,
				url: `/${websiteInfo.slug}/inbox/${conversationId}`,
			},
		}
	);

	if (result.success) {
		console.log(
			`[push] Sent notification to member ${recipient.memberId} for conversation ${conversationId}`
		);
		return { sent: true };
	}

	// If subscription expired, we could clean it up here
	// For now, just log and return
	if (result.error === "subscription_expired") {
		console.log(
			`[push] Subscription expired for member ${recipient.memberId}, notification not sent`
		);
		return { sent: false, reason: "subscription_expired" };
	}

	console.error(
		`[push] Failed to send notification to member ${recipient.memberId}:`,
		result.error
	);
	return { sent: false, reason: result.error };
}
