import { db } from "@api/db";
import {
	recordEmailBounce,
	recordEmailComplaint,
	recordEmailFailure,
} from "@api/db/queries/email-bounce";
import { env } from "@api/env";
import {
	logEmailBounce,
	logEmailComplaint,
	logEmailFailure,
} from "@api/utils/notification-monitoring";

import type { Context } from "hono";
import { Hono } from "hono";
import { resend } from "node_modules/@cossistant/transactional/resend/client";

const resendRouters = new Hono();

type ResendWebhookEvent = {
	type:
		| "email.sent"
		| "email.delivered"
		| "email.bounced"
		| "email.complained"
		| "email.failed"
		| "email.opened"
		| "email.clicked";
	created_at: string;
	data: {
		email_id: string;
		from: string;
		to: string[];
		subject: string;
		bounce?: {
			type: string;
			subType?: string;
			message?: string;
		};
		failed?: {
			reason: string;
		};
		// Additional fields...
	};
};

resendRouters.post("/webhooks", async (c: Context) => {
	try {
		// Get raw body as string for webhook verification
		const payload = await c.req.text();

		// Convert Hono headers to Record<string, string>
		const headers: Record<string, string> = {};
		c.req.raw.headers.forEach((value, key) => {
			headers[key] = value;
		});

		// Throws an error if the webhook is invalid
		// Otherwise, returns the parsed payload object
		const result = resend.webhooks.verify({
			payload,
			headers: {
				id: c.req.raw.headers.get("svix-id") ?? "",
				timestamp: c.req.raw.headers.get("svix-timestamp") ?? "",
				signature: c.req.raw.headers.get("svix-signature") ?? "",
			},
			webhookSecret: env.RESEND_WEBHOOK_SECRET,
		}) as ResendWebhookEvent;

		console.log("[Resend Webhook] Verified webhook:", result.type);

		// Process the webhook event
		await processWebhookEvent(result);

		// Return 200 to acknowledge receipt
		return c.json({ received: true }, 200);
	} catch (error) {
		console.error("[Resend Webhook] Error processing webhook:", error);
		return c.json({ error: "Internal server error" }, 400);
	}
});

/**
 * Process Resend webhook events
 * Handles bounce, complaint, and failure events to protect email reputation
 */
async function processWebhookEvent(event: ResendWebhookEvent): Promise<void> {
	const { type, data } = event;

	// Extract recipient email (use first recipient)
	const recipientEmail = data.to[0];
	if (!recipientEmail) {
		console.warn("[Resend Webhook] No recipient email found in event");
		return;
	}

	// We need to determine the organization ID from the email or context
	// For now, we'll need to query the database to find which organization this email belongs to
	// This is a simplified approach - in production, you might want to include org ID in email tags
	const organizationId = await getOrganizationIdFromEmail(recipientEmail);
	if (!organizationId) {
		console.warn(
			`[Resend Webhook] Could not determine organization for email ${recipientEmail}`
		);
		return;
	}

	switch (type) {
		case "email.bounced":
			if (data.bounce) {
				await recordEmailBounce(db, {
					email: recipientEmail,
					organizationId,
					bounceType: data.bounce.type,
					bounceSubType: data.bounce.subType,
					bounceMessage: data.bounce.message,
					eventId: data.email_id,
				});
				logEmailBounce({
					email: recipientEmail,
					organizationId,
					bounceType: data.bounce.type,
				});
			}
			break;

		case "email.complained":
			await recordEmailComplaint(db, {
				email: recipientEmail,
				organizationId,
				eventId: data.email_id,
			});
			logEmailComplaint({
				email: recipientEmail,
				organizationId,
			});
			break;

		case "email.failed":
			if (data.failed) {
				await recordEmailFailure(db, {
					email: recipientEmail,
					organizationId,
					failureReason: data.failed.reason,
					eventId: data.email_id,
				});
				logEmailFailure({
					email: recipientEmail,
					organizationId,
					reason: data.failed.reason,
				});
			}
			break;

		default:
			// Log other events for monitoring but don't process them
			console.log(
				`[Resend Webhook] Received ${type} event for ${recipientEmail}`
			);
	}
}

/**
 * Get organization ID from recipient email
 * This queries the database to find which organization the email belongs to
 */
async function getOrganizationIdFromEmail(
	email: string
): Promise<string | null> {
	try {
		// Import schema
		const { user, member, contact } = await import("@api/db/schema");
		const { eq } = await import("drizzle-orm");

		// Check if email belongs to a user (member)
		const [userResult] = await db
			.select({
				userId: user.id,
			})
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		if (userResult) {
			// Get member info for this user
			const [memberResult] = await db
				.select({
					organizationId: member.organizationId,
				})
				.from(member)
				.where(eq(member.userId, userResult.userId))
				.limit(1);

			if (memberResult?.organizationId) {
				return memberResult.organizationId;
			}
		}

		// Check if email belongs to a contact (visitor)
		const [contactResult] = await db
			.select({
				organizationId: contact.organizationId,
			})
			.from(contact)
			.where(eq(contact.email, email))
			.limit(1);

		if (contactResult?.organizationId) {
			return contactResult.organizationId;
		}

		return null;
	} catch (error) {
		console.error(
			`[Resend Webhook] Error finding organization for email ${email}:`,
			error
		);
		return null;
	}
}

export { resendRouters };
