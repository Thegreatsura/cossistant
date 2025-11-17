import { db } from "@api/db";
import { isEmailSuppressed } from "@api/db/queries/email-bounce";
import {
	generateEmailIdempotencyKey,
	generateInboundReplyAddress,
	generateThreadingHeaders,
} from "@api/utils/email-threading";
import {
	getMessagesForEmail,
	getNotificationData,
	getVisitorEmailForNotification,
	isVisitorEmailNotificationEnabled,
} from "@api/utils/notification-helpers";
import {
	logEmailSent,
	logEmailSuppressed,
} from "@api/utils/notification-monitoring";
import {
	clearWorkflowState,
	getWorkflowState,
	isActiveWorkflow,
	type WorkflowDirection,
} from "@api/utils/workflow-dedup-manager";
import {
	MAX_MESSAGES_IN_EMAIL,
	MESSAGE_NOTIFICATION_DELAY_MINUTES,
} from "@api/workflows/constants";
import { sendMemberEmailNotification } from "@api/workflows/member-email-notifier";
import { NewMessageInConversation, sendEmail } from "@cossistant/transactional";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";

// Needed for email templates, don't remove
import React from "react";

import type { MemberSentMessageData, VisitorSentMessageData } from "./types";

type BaseMessagePayload = {
        conversationId: string;
        websiteId: string;
        organizationId: string;
};

type SetupResult<P extends BaseMessagePayload> =
        | { status: "missing" | "inactive" | "no-state" }
        | { status: "ok"; payload: P; workflowState: Awaited<ReturnType<typeof getWorkflowState>>; workflowRunId?: string };

async function runWorkflowSetup<P extends BaseMessagePayload>(
        context: Parameters<Parameters<typeof serve<P>>[0]>[0],
        direction: WorkflowDirection
): Promise<SetupResult<P>> {
        return context.run("setup", async () => {
                const payload = context.requestPayload as P | null;
                const workflowRunId = context.headers.get("upstash-workflow-runid");

                if (!payload) {
                        console.error("[workflow] Missing payload in message workflow");
                        return { status: "missing" as const };
                }

                if (workflowRunId) {
                        const active = await isActiveWorkflow(payload.conversationId, direction, workflowRunId);

                        if (!active) {
                                console.log(
                                        `[workflow] Workflow ${workflowRunId} is no longer active for ${payload.conversationId}, exiting`
                                );
                                return { status: "inactive" as const };
                        }
                }

                const workflowState = await getWorkflowState(payload.conversationId, direction);

                if (!workflowState) {
                        console.error(`[workflow] No workflow state found for ${payload.conversationId}, this should not happen`);
                        return { status: "no-state" as const };
                }

                return { status: "ok", payload, workflowState, workflowRunId };
        });
}

async function prepareNotificationData({
        conversationId,
        websiteId,
        organizationId,
        excludeUserId,
        includeVisitorRecipient,
}: {
        conversationId: string;
        websiteId: string;
        organizationId: string;
        excludeUserId?: string;
        includeVisitorRecipient: boolean;
}) {
        const { conversation, websiteInfo, participants } = await getNotificationData(db, {
                conversationId,
                websiteId,
                organizationId,
                excludeUserId,
        });

        if (!conversation || !websiteInfo) {
                return null;
        }

        const memberRecipients = participants.map((participant) => ({
                kind: "member" as const,
                userId: participant.userId,
                memberId: participant.memberId,
                email: participant.userEmail,
        }));

        let visitorRecipient: {
                kind: "visitor";
                visitorId: string;
                email: string;
        } | null = null;

        if (includeVisitorRecipient && conversation.visitorId) {
                const visitorInfo = await getVisitorEmailForNotification(db, {
                        visitorId: conversation.visitorId,
                        websiteId,
                });

                if (visitorInfo?.contactEmail) {
                        const visitorNotificationsEnabled = await isVisitorEmailNotificationEnabled(db, {
                                visitorId: conversation.visitorId,
                                websiteId,
                        });

                        if (visitorNotificationsEnabled) {
                                visitorRecipient = {
                                        kind: "visitor",
                                        visitorId: conversation.visitorId,
                                        email: visitorInfo.contactEmail,
                                };
                        }
                }
        }

        return {
                conversationId,
                websiteId,
                organizationId,
                conversation,
                websiteInfo,
                memberRecipients,
                visitorRecipient,
        };
}

const messageWorkflow = new Hono();

messageWorkflow.post(
        "/member-sent-message",
        serve<MemberSentMessageData>(async (context) => {
                const direction: WorkflowDirection = "member-to-visitor";

                const setup = await runWorkflowSetup<MemberSentMessageData>(context, direction);

                if (setup?.status !== "ok") {
                        return;
                }

                const {
                        payload: { conversationId, websiteId, organizationId, senderId },
                        workflowState,
                } = setup;

		// Step 1: Prepare data (conversation, website, participants, seen state, recipients)
                const prepared = await context.run("prepare-data", async () => {
                        return prepareNotificationData({
                                conversationId,
                                websiteId,
                                organizationId,
                                excludeUserId: senderId,
                                includeVisitorRecipient: true,
                        });
                });

		if (!prepared) {
			return;
		}

		// Step 2: Apply a single global delay for all recipients
		const globalDelaySeconds = MESSAGE_NOTIFICATION_DELAY_MINUTES * 60;

		if (globalDelaySeconds > 0) {
			await context.sleep("global-delay", globalDelaySeconds);
		}

		// Step 3: Send notifications in a single step with an internal loop
		await context.run("send-notifications", async () => {
			// Send emails to member recipients using the shared helper
			for (const recipient of prepared.memberRecipients) {
				await sendMemberEmailNotification({
					db,
					recipient,
					conversationId: prepared.conversationId,
					organizationId: prepared.organizationId,
					websiteInfo: prepared.websiteInfo,
					workflowState,
				});
			}

			// Handle visitor recipient separately (keeping inline for now)
			if (prepared.visitorRecipient?.email) {
				// Visitor preferences already checked in prepare-data

				// Fetch unseen messages for visitor
				const { messages, totalCount } = await getMessagesForEmail(db, {
					conversationId: prepared.conversationId,
					organizationId: prepared.organizationId,
					recipientVisitorId: prepared.visitorRecipient.visitorId,
					maxMessages: MAX_MESSAGES_IN_EMAIL,
					earliestCreatedAt: workflowState.initialMessageCreatedAt,
				});

				if (messages.length > 0) {
					// Check suppression
					const isSuppressed = await isEmailSuppressed(db, {
						email: prepared.visitorRecipient.email,
						organizationId: prepared.organizationId,
					});

					if (isSuppressed) {
						logEmailSuppressed({
							email: prepared.visitorRecipient.email,
							conversationId: prepared.conversationId,
							organizationId: prepared.organizationId,
							reason: "bounced_or_complained",
						});
					} else {
						// Send email notification
						const threadingHeaders = generateThreadingHeaders({
							conversationId: prepared.conversationId,
						});

						const idempotencyKey = generateEmailIdempotencyKey({
							conversationId: prepared.conversationId,
							recipientEmail: prepared.visitorRecipient.email,
							timestamp: new Date(
								workflowState.initialMessageCreatedAt
							).getTime(),
						});

						await sendEmail(
							{
								to: prepared.visitorRecipient.email,
								replyTo: generateInboundReplyAddress({
									conversationId: prepared.conversationId,
								}),
								subject:
									totalCount > 1
										? `${totalCount} new messages from ${prepared.websiteInfo.name}`
										: `New message from ${prepared.websiteInfo.name}`,
								react: (
									<NewMessageInConversation
										conversationId={prepared.conversationId}
										email={prepared.visitorRecipient.email}
										isReceiverVisitor={true}
										messages={messages}
										totalCount={totalCount}
										website={{
											name: prepared.websiteInfo.name,
											slug: prepared.websiteInfo.slug,
											logo: prepared.websiteInfo.logo,
										}}
									/>
								),
								variant: "notifications",
								headers: threadingHeaders,
							},
							{ idempotencyKey }
						);

						logEmailSent({
							email: prepared.visitorRecipient.email,
							conversationId: prepared.conversationId,
							organizationId: prepared.organizationId,
						});
					}
				}
			}
		});

		// Step 4: Clean up workflow state after successful completion
		await context.run("cleanup-state", async () => {
			await clearWorkflowState(conversationId, direction);
		});
	})
);

messageWorkflow.post(
        "/visitor-sent-message",
        serve<VisitorSentMessageData>(async (context) => {
                const direction: WorkflowDirection = "visitor-to-member";

                const setup = await runWorkflowSetup<VisitorSentMessageData>(context, direction);

                if (setup?.status !== "ok") {
                        return;
                }

                const {
                        payload: { conversationId, websiteId, organizationId },
                        workflowState,
                } = setup;

		// Step 1: Prepare data (conversation, website, participants, seen state, recipients)
                const prepared = await context.run("prepare-data", async () => {
                        return prepareNotificationData({
                                conversationId,
                                websiteId,
                                organizationId,
                                includeVisitorRecipient: false,
                        });
                });

		if (!prepared) {
			return;
		}

		// Step 2: Apply a single global delay for all recipients
		const globalDelaySeconds = MESSAGE_NOTIFICATION_DELAY_MINUTES * 60;

		if (globalDelaySeconds > 0) {
			await context.sleep("global-delay", globalDelaySeconds);
		}

		// Step 3: Send notifications in a single step with an internal loop
		await context.run("send-notifications", async () => {
			// Send emails to member recipients using the shared helper
			for (const recipient of prepared.memberRecipients) {
				await sendMemberEmailNotification({
					db,
					recipient,
					conversationId: prepared.conversationId,
					organizationId: prepared.organizationId,
					websiteInfo: prepared.websiteInfo,
					workflowState,
				});
			}
		});

		// Step 4: Clean up workflow state after successful completion
		await context.run("cleanup-state", async () => {
			await clearWorkflowState(conversationId, direction);
		});
	})
);

export default messageWorkflow;
