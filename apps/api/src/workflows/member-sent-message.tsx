import { db } from "@api/db";
import { getConversationById } from "@api/db/queries/conversation";
import { env } from "@api/env";
import { sendEmail } from "@api/lib/resend";
import {
	getConversationParticipantsForNotification,
	getMemberNotificationPreference,
	getMessagesForEmail,
	getVisitorEmailForNotification,
	getWebsiteForNotification,
} from "@api/utils/notification-helpers";
import {
	MAX_MESSAGES_IN_EMAIL,
	VISITOR_MESSAGE_DELAY_MINUTES,
} from "@api/workflows/constants";
import { NewMessageInConversation } from "@cossistant/transactional/emails/new-message-in-conversation";
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

		// Send email notification to visitor
		await context.run("send-visitor-email", async () => {
			if (!visitorInfo.contactEmail) {
				console.log(
					`[dev] No email found for visitor ${conversation.visitorId}, skipping email`
				);
				return;
			}

			try {
				await sendEmail({
					to: [visitorInfo.contactEmail],
					subject:
						visitorTotalCount > 1
							? `${visitorTotalCount} new messages from ${websiteInfo.name}`
							: `New message from ${websiteInfo.name}`,
					content: (
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
					includeUnsubscribe: false,
				});
				console.log(
					`[dev] Email sent successfully to visitor ${conversation.visitorId}`
				);
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
