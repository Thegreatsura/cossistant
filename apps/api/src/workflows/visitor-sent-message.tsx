import { db } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { isEmailSuppressed } from "@api/db/queries/email-bounce";
import {
	generateEmailIdempotencyKey,
	generateThreadingHeaders,
} from "@api/utils/email-threading";
import {
	getConversationParticipantsForNotification,
	getMemberNotificationPreference,
	getMessagesForEmail,
	getWebsiteForNotification,
} from "@api/utils/notification-helpers";
import {
	logEmailSent,
	logEmailSuppressed,
} from "@api/utils/notification-monitoring";
import { MAX_MESSAGES_IN_EMAIL } from "@api/workflows/constants";
import { NewMessageInConversation, sendEmail } from "@cossistant/transactional";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";

// Needed for email templates, don't remove
import React from "react";

import type { VisitorSentMessageData } from "./types";

const visitorSentMessageWorkflow = new Hono();

visitorSentMessageWorkflow.post(
	"/visitor-sent",
	serve<VisitorSentMessageData>(async (context) => {
		const { conversationId, websiteId, organizationId, visitorId } =
			context.requestPayload;

		console.log(
			`[dev] Visitor-sent message workflow triggered for conversation ${conversationId}`
		);

		// Step 1: Fetch conversation details
		const conversation = await context.run("fetch-conversation", async () => {
			console.log(`[dev] Fetching conversation details for ${conversationId}`);
			return getConversationById(db, { conversationId });
		});

		if (!conversation) {
			console.log(
				`[dev] Conversation ${conversationId} not found, aborting workflow`
			);
			return;
		}

		// Step 2: Fetch website details
		const websiteInfo = await context.run("fetch-website", async () => {
			console.log(`[dev] Fetching website details for ${websiteId}`);
			return getWebsiteForNotification(db, { websiteId });
		});

		if (!websiteInfo) {
			console.log(`[dev] Website ${websiteId} not found, aborting workflow`);
			return;
		}

		// Step 3: Fetch conversation participants (all members, no exclusion)
		const participants = await context.run("fetch-participants", async () => {
			console.log(
				`[dev] Fetching participants for conversation ${conversationId}`
			);
			return getConversationParticipantsForNotification(db, {
				conversationId,
				organizationId,
			});
		});

		console.log(`[dev] Found ${participants.length} participant(s) to notify`);

		// Step 4: Notify each participant
		for (const participant of participants) {
			console.log(
				`[dev] Processing notifications for participant ${participant.userId}`
			);

			// Get participant's notification preferences
			const preference = await context.run(
				`get-preference-${participant.userId}`,
				async () => {
					console.log(
						`[dev] Fetching notification preferences for member ${participant.memberId}`
					);
					return getMemberNotificationPreference(db, {
						memberId: participant.memberId,
						organizationId,
					});
				}
			);

			// Check if email notifications are enabled
			if (!preference?.enabled) {
				console.log(
					`[dev] Email notifications disabled for participant ${participant.userId}, skipping`
				);
				continue;
			}

			// Apply member-specific delay
			const delaySeconds = preference.delaySeconds || 0;
			if (delaySeconds > 0) {
				console.log(
					`[dev] Applying ${delaySeconds}s delay for participant ${participant.userId}`
				);
				await context.sleep(`delay-${participant.userId}`, delaySeconds);
			}

			// Check if messages have been seen after the delay
			const { messages, totalCount } = await context.run(
				`check-unseen-${participant.userId}`,
				async () => {
					console.log(
						`[dev] Checking for unseen messages for participant ${participant.userId}`
					);
					return getMessagesForEmail(db, {
						conversationId,
						organizationId,
						recipientUserId: participant.userId,
						maxMessages: MAX_MESSAGES_IN_EMAIL,
					});
				}
			);

			if (messages.length === 0) {
				console.log(
					`[dev] All messages seen by participant ${participant.userId}, skipping email`
				);
				continue;
			}

			console.log(
				`[dev] Found ${totalCount} unseen message(s) for participant ${participant.userId}, sending email`
			);

			// Check if email is suppressed (bounced/complained)
			const isSuppressed = await context.run(
				`check-suppressed-${participant.userId}`,
				async () =>
					isEmailSuppressed(db, {
						email: participant.userEmail,
						organizationId,
					})
			);

			if (isSuppressed) {
				console.log(
					`[dev] Email ${participant.userEmail} is suppressed (bounced/complained), skipping`
				);
				logEmailSuppressed({
					email: participant.userEmail,
					conversationId,
					organizationId,
					reason: "bounced_or_complained",
				});
				continue;
			}

			// Send email notification
			await context.run(`send-email-${participant.userId}`, async () => {
				try {
					// Generate threading headers for conversation continuity
					const threadingHeaders = generateThreadingHeaders({
						conversationId,
					});

					// Generate idempotency key to prevent duplicate sends
					const idempotencyKey = generateEmailIdempotencyKey({
						conversationId,
						recipientEmail: participant.userEmail,
					});

					await sendEmail(
						{
							to: participant.userEmail,
							subject:
								totalCount > 1
									? `${totalCount} new messages from ${websiteInfo.name}`
									: `New message from ${websiteInfo.name}`,
							react: (
								<NewMessageInConversation
									conversationId={conversationId}
									email={participant.userEmail}
									messages={messages}
									totalCount={totalCount}
									website={{
										name: websiteInfo.name,
										slug: websiteInfo.slug,
										logo: websiteInfo.logo,
									}}
								/>
							),
							variant: "notifications",
							headers: threadingHeaders,
						},
						{ idempotencyKey }
					);
					console.log(
						`[dev] Email sent successfully to participant ${participant.userId}`
					);
					logEmailSent({
						email: participant.userEmail,
						conversationId,
						organizationId,
					});
				} catch (error) {
					console.error(
						`[dev] Failed to send email to participant ${participant.userId}:`,
						error
					);
					throw error;
				}
			});
		}

		console.log(
			`[dev] Visitor-sent message workflow completed for conversation ${conversationId}`
		);
	})
);

export default visitorSentMessageWorkflow;
