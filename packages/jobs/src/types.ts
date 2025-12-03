// Queue names registry
export const QUEUE_NAMES = {
	MESSAGE_NOTIFICATION: "message-notification",
} as const;

/**
 * Direction of the message notification
 */
export type MessageNotificationDirection =
	| "member-to-visitor"
	| "visitor-to-member";

/**
 * Job data for message notification queue
 */
export type MessageNotificationJobData = {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	direction: MessageNotificationDirection;
	senderId?: string;
	visitorId?: string;
	initialMessageCreatedAt: string;
};

/**
 * Generate a unique job ID for message notification
 */
export function generateMessageNotificationJobId(
	conversationId: string,
	direction: MessageNotificationDirection
): string {
	return `msg-notif-${conversationId}-${direction}`;
}
