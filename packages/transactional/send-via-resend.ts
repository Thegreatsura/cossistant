import { resend } from "./resend";
import { ANTHONY_EMAIL, VARIANT_TO_FROM_MAP } from "./resend/constants";
import type {
	ResendBulkEmailOptions,
	ResendEmailOptions,
} from "./resend/types";

/**
 * Transform email options to Resend format
 * Follows the Dub.co pattern for clean email sending
 */
const prepareEmailOptions = (opts: ResendEmailOptions) => {
	const {
		to,
		from,
		variant = "notifications",
		bcc,
		replyTo,
		subject,
		text,
		react,
		scheduledAt,
		headers = {},
		tags,
		...rest
	} = opts;

	// Prepare the base email object
	const emailData: Record<string, unknown> = {
		to: Array.isArray(to) ? to : [to],
		from: from || VARIANT_TO_FROM_MAP[variant],
		subject,
		...rest,
	};

	// Add optional fields
	if (bcc) {
		emailData.bcc = bcc;
	}
	if (text) {
		emailData.text = text;
	}
	if (react) {
		emailData.react = react;
	}
	if (scheduledAt) {
		emailData.scheduledAt = scheduledAt;
	}
	if (tags) {
		emailData.tags = tags;
	}

	// Handle replyTo - if explicitly set to "noreply", omit it, otherwise use provided or default
	if (replyTo !== "noreply") {
		emailData.replyTo = replyTo || ANTHONY_EMAIL;
	}

	// Add List-Unsubscribe header for marketing emails
	if (variant === "marketing") {
		emailData.headers = {
			...headers,
			"List-Unsubscribe": "<https://cossistant.com/settings/notifications>",
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		};
	} else if (Object.keys(headers).length > 0) {
		emailData.headers = headers;
	}

	return emailData;
};

/**
 * Send a single email using Resend
 * @example
 * await sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   react: <WelcomeEmail />,
 *   variant: "notifications",
 * });
 */
export const sendEmail = async (opts: ResendEmailOptions) => {
	if (!resend) {
		console.warn(
			"RESEND_API_KEY is not set in the environment. Skipping email send."
		);
		return { data: null, error: new Error("Resend client not initialized") };
	}

	try {
		return await resend.emails.send(prepareEmailOptions(opts));
	} catch (error) {
		console.error("Failed to send email:", error);
		throw error;
	}
};

/**
 * Send multiple emails in batch using Resend
 * @example
 * await sendBatchEmail([
 *   { to: "user1@example.com", subject: "Welcome!", react: <Email /> },
 *   { to: "user2@example.com", subject: "Welcome!", react: <Email /> },
 * ]);
 */
export const sendBatchEmail = async (
	opts: ResendBulkEmailOptions,
	options?: { idempotencyKey?: string }
) => {
	if (!resend) {
		console.warn(
			"RESEND_API_KEY is not set in the environment. Skipping batch email send."
		);
		return { data: null, error: new Error("Resend client not initialized") };
	}

	if (opts.length === 0) {
		return { data: null, error: null };
	}

	try {
		const payload = opts.map(prepareEmailOptions);
		const { idempotencyKey } = options || {};

		return await resend.batch.send(
			payload,
			idempotencyKey ? { idempotencyKey } : undefined
		);
	} catch (error) {
		console.error("Failed to send batch emails:", error);
		throw error;
	}
};

// Legacy exports for backward compatibility
export const sendEmailViaResend = sendEmail;
export const sendBatchEmailViaResend = sendBatchEmail;
