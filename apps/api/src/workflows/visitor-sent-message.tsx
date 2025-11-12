import { db } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { sendEmail } from "@api/lib/resend";
import {
	getConversationParticipantsForNotification,
	getMemberNotificationPreference,
	getMessagesForEmail,
	getWebsiteForNotification,
} from "@api/utils/notification-helpers";
import { MAX_MESSAGES_IN_EMAIL } from "@api/workflows/constants";
import { NewMessageInConversation } from "@cossistant/transactional/emails/new-message-in-conversation";
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

			// Send email notification
			await context.run(`send-email-${participant.userId}`, async () => {
				try {
					await sendEmail({
						to: [participant.userEmail],
						subject:
							totalCount > 1
								? `${totalCount} new messages from ${websiteInfo.name}`
								: `New message from ${websiteInfo.name}`,
						content: (
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
						includeUnsubscribe: false,
					});
					console.log(
						`[dev] Email sent successfully to participant ${participant.userId}`
					);
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
