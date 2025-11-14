import { db } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { isEmailSuppressed } from "@api/db/queries/email-bounce";
import { env } from "@api/env";
import {
	generateEmailIdempotencyKey,
	generateThreadingHeaders,
} from "@api/utils/email-threading";
import {
	getConversationParticipantsForNotification,
	getMemberNotificationPreference,
	getMessagesForEmail,
	getVisitorEmailForNotification,
	getWebsiteForNotification,
	isVisitorEmailNotificationEnabled,
} from "@api/utils/notification-helpers";
import {
	logEmailSent,
	logEmailSuppressed,
} from "@api/utils/notification-monitoring";
import {
	MAX_MESSAGES_IN_EMAIL,
	VISITOR_MESSAGE_DELAY_MINUTES,
} from "@api/workflows/constants";
import { NewMessageInConversation, sendEmail } from "@cossistant/transactional";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";

// Needed for email templates, don't remove
import React from "react";

import type { MemberSentMessageData } from "./types";

const memberSentMessageWorkflow = new Hono();

memberSentMessageWorkflow.post(
	"/member-sent",
	serve<MemberSentMessageData>(async (context) => {
		const { conversationId, websiteId, organizationId, senderId } =
			context.requestPayload;

		console.log(
			`[dev] Member-sent message workflow triggered for conversation ${conversationId}`
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

		// Step 3: Fetch conversation participants (excluding sender)
		const participants = await context.run("fetch-participants", async () => {
			console.log(
				`[dev] Fetching participants for conversation ${conversationId}, excluding sender ${senderId}`
			);
			return getConversationParticipantsForNotification(db, {
				conversationId,
				organizationId,
				excludeUserId: senderId,
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

		// Step 5: Notify visitor if they have an email
		const visitorInfo = await context.run("fetch-visitor-email", async () => {
			console.log(`[dev] Fetching visitor email for ${conversation.visitorId}`);
			return getVisitorEmailForNotification(db, {
				visitorId: conversation.visitorId,
				websiteId,
			});
		});

		if (!visitorInfo?.contactEmail) {
			console.log(
				`[dev] No email found for visitor ${conversation.visitorId}, skipping visitor notification`
			);
			return;
		}

		console.log(
			`[dev] Visitor has email ${visitorInfo.contactEmail}, processing notification`
		);

		// Check if visitor has email notifications enabled
		const visitorNotificationsEnabled = await context.run(
			"check-visitor-preferences",
			async () =>
				isVisitorEmailNotificationEnabled(db, {
					visitorId: conversation.visitorId,
					websiteId,
				})
		);

		if (!visitorNotificationsEnabled) {
			console.log(
				`[dev] Visitor ${conversation.visitorId} has email notifications disabled, skipping`
			);
			return;
		}

		// Apply fixed visitor delay
		const visitorDelaySeconds = VISITOR_MESSAGE_DELAY_MINUTES * 60;
		console.log(
			`[dev] Applying ${visitorDelaySeconds}s delay for visitor notification`
		);
		await context.sleep("visitor-delay", visitorDelaySeconds);

		// Check if messages have been seen by visitor
		const { messages: visitorMessages, totalCount: visitorTotalCount } =
			await context.run("check-visitor-unseen", async () => {
				console.log(
					`[dev] Checking for unseen messages for visitor ${conversation.visitorId}`
				);
				return getMessagesForEmail(db, {
					conversationId,
					organizationId,
					recipientVisitorId: conversation.visitorId,
					maxMessages: MAX_MESSAGES_IN_EMAIL,
				});
			});

		if (visitorMessages.length === 0) {
			console.log(
				`[dev] All messages seen by visitor ${conversation.visitorId}, skipping email`
			);
			return;
		}

		console.log(
			`[dev] Found ${visitorTotalCount} unseen message(s) for visitor, sending email`
		);

		// Check if visitor email is suppressed
		const visitorEmail = visitorInfo.contactEmail;

		const isVisitorSuppressed = await context.run(
			"check-visitor-suppressed",
			async () =>
				isEmailSuppressed(db, {
					email: visitorEmail,
					organizationId,
				})
		);

		if (isVisitorSuppressed) {
			console.log(
				`[dev] Visitor email ${visitorEmail} is suppressed (bounced/complained), skipping`
			);
			logEmailSuppressed({
				email: visitorEmail,
				conversationId,
				organizationId,
				reason: "bounced_or_complained",
			});
			return;
		}

		// Send email notification to visitor
		await context.run("send-visitor-email", async () => {
			if (!visitorInfo.contactEmail) {
				console.log(
					`[dev] No email found for visitor ${conversation.visitorId}, skipping email`
				);
				return;
			}

			try {
				// Generate threading headers for conversation continuity
				const threadingHeaders = generateThreadingHeaders({
					conversationId,
				});

				// Generate idempotency key to prevent duplicate sends
				const idempotencyKey = generateEmailIdempotencyKey({
					conversationId,
					recipientEmail: visitorInfo.contactEmail,
				});

				await sendEmail(
					{
						to: visitorInfo.contactEmail,
						subject:
							visitorTotalCount > 1
								? `${visitorTotalCount} new messages from ${websiteInfo.name}`
								: `New message from ${websiteInfo.name}`,
						react: (
							<NewMessageInConversation
								conversationId={conversationId}
								email={visitorInfo.contactEmail}
								messages={visitorMessages}
								totalCount={visitorTotalCount}
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
					`[dev] Email sent successfully to visitor ${conversation.visitorId}`
				);
				logEmailSent({
					email: visitorInfo.contactEmail,
					conversationId,
					organizationId,
				});
			} catch (error) {
				console.error(
					`[dev] Failed to send email to visitor ${conversation.visitorId}:`,
					error
				);
				throw error;
			}
		});

		console.log(
			`[dev] Member-sent message workflow completed for conversation ${conversationId}`
		);
	})
);

export default memberSentMessageWorkflow;
