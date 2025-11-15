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

import type { MemberSentMessageData, VisitorSentMessageData } from "./types";

const messageWorkflow = new Hono();

messageWorkflow.post(
	"/member-sent-message",
	serve<MemberSentMessageData>(async (context) => {
		const { conversationId, websiteId, organizationId, senderId } =
			context.requestPayload;

		// Step 1: Fetch conversation details
		const conversation = await context.run("fetch-conversation", async () =>
			getConversationById(db, { conversationId })
		);

		if (!conversation) {
			return;
		}

		// Step 2: Fetch website details
		const websiteInfo = await context.run("fetch-website", async () =>
			getWebsiteForNotification(db, { websiteId })
		);

		if (!websiteInfo) {
			return;
		}

		// Step 3: Fetch conversation participants (excluding sender)
		const participants = await context.run("fetch-participants", async () =>
			getConversationParticipantsForNotification(db, {
				conversationId,
				organizationId,
				excludeUserId: senderId,
			})
		);

		// Step 4: Notify each participant
		for (const participant of participants) {
			// Get participant's notification preferences
			const preference = await context.run(
				`get-preference-${participant.userId}`,
				async () =>
					getMemberNotificationPreference(db, {
						memberId: participant.memberId,
						organizationId,
					})
			);

			// Check if email notifications are enabled
			if (!preference?.enabled) {
				continue;
			}

			// Apply member-specific delay
			const delaySeconds = preference.delaySeconds || 0;
			if (delaySeconds > 0) {
				await context.sleep(`delay-${participant.userId}`, delaySeconds);
			}

			// Check if messages have been seen after the delay
			const { messages, totalCount } = await context.run(
				`check-unseen-${participant.userId}`,
				async () =>
					getMessagesForEmail(db, {
						conversationId,
						organizationId,
						recipientUserId: participant.userId,
						maxMessages: MAX_MESSAGES_IN_EMAIL,
					})
			);

			if (messages.length === 0) {
				continue;
			}

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
								isReceiverVisitor={false}
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
				logEmailSent({
					email: participant.userEmail,
					conversationId,
					organizationId,
				});
			});
		}

		// Step 5: Notify visitor if they have an email
		const visitorInfo = await context.run("fetch-visitor-email", async () =>
			getVisitorEmailForNotification(db, {
				visitorId: conversation.visitorId,
				websiteId,
			})
		);

		if (!visitorInfo?.contactEmail) {
			return;
		}

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
			return;
		}

		// Apply fixed visitor delay
		const visitorDelaySeconds = VISITOR_MESSAGE_DELAY_MINUTES * 60;
		await context.sleep("visitor-delay", visitorDelaySeconds);

		// Check if messages have been seen by visitor
		const { messages: visitorMessages, totalCount: visitorTotalCount } =
			await context.run("check-visitor-unseen", async () =>
				getMessagesForEmail(db, {
					conversationId,
					organizationId,
					recipientVisitorId: conversation.visitorId,
					maxMessages: MAX_MESSAGES_IN_EMAIL,
				})
			);

		if (visitorMessages.length === 0) {
			return;
		}

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
				return;
			}

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
							isReceiverVisitor={true}
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
			logEmailSent({
				email: visitorInfo.contactEmail,
				conversationId,
				organizationId,
			});
		});
	})
);

messageWorkflow.post(
	"/visitor-sent-message",
	serve<VisitorSentMessageData>(async (context) => {
		const { conversationId, websiteId, organizationId, visitorId } =
			context.requestPayload;

		// Step 1: Fetch conversation details
		const conversation = await context.run("fetch-conversation", async () =>
			getConversationById(db, { conversationId })
		);

		if (!conversation) {
			return;
		}

		// Step 2: Fetch website details
		const websiteInfo = await context.run("fetch-website", async () =>
			getWebsiteForNotification(db, { websiteId })
		);

		if (!websiteInfo) {
			return;
		}

		// Step 3: Fetch conversation participants (all members, no exclusion)
		const participants = await context.run("fetch-participants", async () =>
			getConversationParticipantsForNotification(db, {
				conversationId,
				organizationId,
			})
		);

		// Step 4: Notify each participant
		for (const participant of participants) {
			// Get participant's notification preferences
			const preference = await context.run(
				`get-preference-${participant.userId}`,
				async () =>
					getMemberNotificationPreference(db, {
						memberId: participant.memberId,
						organizationId,
					})
			);

			// Check if email notifications are enabled
			if (!preference?.enabled) {
				continue;
			}

			// Apply member-specific delay
			const delaySeconds = preference.delaySeconds || 0;
			if (delaySeconds > 0) {
				await context.sleep(`delay-${participant.userId}`, delaySeconds);
			}

			// Check if messages have been seen after the delay
			const { messages, totalCount } = await context.run(
				`check-unseen-${participant.userId}`,
				async () =>
					getMessagesForEmail(db, {
						conversationId,
						organizationId,
						recipientUserId: participant.userId,
						maxMessages: MAX_MESSAGES_IN_EMAIL,
					})
			);

			if (messages.length === 0) {
				continue;
			}

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
								isReceiverVisitor={false}
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
				logEmailSent({
					email: participant.userEmail,
					conversationId,
					organizationId,
				});
			});
		}
	})
);

export default messageWorkflow;
