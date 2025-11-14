/**
 * Email threading utilities for maintaining conversation continuity
 * Generates proper Message-ID, In-Reply-To, and References headers
 */

/**
 * Generate a unique Message-ID for an email
 * Format: <msg-{messageId}@cossistant.com>
 */
export function generateMessageId(messageId: string): string {
	return `<msg-${messageId}@cossistant.com>`;
}

/**
 * Generate a conversation thread ID
 * Format: <conv-{conversationId}@cossistant.com>
 */
export function generateConversationThreadId(conversationId: string): string {
	return `<conv-${conversationId}@cossistant.com>`;
}

/**
 * Generate email threading headers for a conversation message
 * These headers ensure emails thread properly in Gmail, Outlook, etc.
 */
export function generateThreadingHeaders(params: {
	conversationId: string;
	messageId?: string;
}): Record<string, string> {
	const threadId = generateConversationThreadId(params.conversationId);

	const headers: Record<string, string> = {
		// In-Reply-To: Indicates this email is a reply to the conversation thread
		"In-Reply-To": threadId,
		// References: Maintains the thread chain
		References: threadId,
	};

	// If we have a specific message ID, use it as the Message-ID
	// Otherwise, let Resend generate one
	if (params.messageId) {
		headers["Message-ID"] = generateMessageId(params.messageId);
	}

	return headers;
}

/**
 * Generate an idempotency key for email sending
 * Ensures emails aren't sent twice on retry
 * Format: conv-{conversationId}-{timestamp}
 */
export function generateEmailIdempotencyKey(params: {
	conversationId: string;
	recipientEmail: string;
	timestamp?: number;
}): string {
	const ts = params.timestamp ?? Date.now();
	// Include recipient email to allow different emails per recipient in the same batch
	// Use a hash of the email to keep the key shorter
	const emailHash = params.recipientEmail
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return `conv-${params.conversationId}-${emailHash}-${ts}`;
}
