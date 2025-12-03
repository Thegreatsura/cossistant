import { db } from "@api/db";
import { getActiveAiAgentForWebsite } from "@api/db/queries/ai-agent";
import { getMessageMetadata } from "@api/db/queries/conversation";
import {
	getLatestMessageForPush,
	getNotificationData,
} from "@api/utils/notification-helpers";
import { workflowClient } from "@api/utils/workflow";
import {
	triggerDeduplicatedWorkflow,
	type WorkflowDirection,
} from "@api/utils/workflow-dedup-manager";
import { sendMemberPushNotification } from "@api/workflows/message/member-push-notifier";
import {
	type AiAgentResponseData,
	type MemberSentMessageData,
	type VisitorSentMessageData,
	WORKFLOW,
} from "@api/workflows/types";

/**
 * Trigger notification workflow when a member sends a message
 * This notifies other participants and the visitor
 */
export async function triggerMemberSentMessageWorkflow(params: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	senderId: string;
}): Promise<void> {
	const data: MemberSentMessageData = {
		conversationId: params.conversationId,
		messageId: params.messageId,
		websiteId: params.websiteId,
		organizationId: params.organizationId,
		senderId: params.senderId,
	};

	try {
		// Fetch message metadata for deduplication
		const messageMetadata = await getMessageMetadata(db, {
			messageId: params.messageId,
			organizationId: params.organizationId,
		});

		if (!messageMetadata) {
			console.error(
				`[dev] Message ${params.messageId} not found, skipping notification workflow`
			);
			return;
		}

		console.log(
			`[dev] Triggering member-sent message workflow for conversation ${params.conversationId}`
		);

		const { workflowRunId, isReplacement } = await triggerDeduplicatedWorkflow({
			client: workflowClient,
			path: WORKFLOW.MEMBER_SENT_MESSAGE,
			data,
			conversationId: params.conversationId,
			direction: "member-to-visitor" as WorkflowDirection,
			messageId: params.messageId,
			messageCreatedAt: messageMetadata.createdAt,
		});

		console.log(
			`[dev] Member-sent message workflow ${isReplacement ? "replaced" : "triggered"} successfully for conversation ${params.conversationId}, workflowRunId: ${workflowRunId}`
		);
	} catch (error) {
		// Log errors but don't throw - we don't want to block message creation
		console.error(
			`[dev] Failed to trigger member-sent message workflow for conversation ${params.conversationId}:`,
			error
		);
	}
}

/**
 * Send immediate push notifications to team members
 * This is called synchronously when a visitor sends a message
 * Uses the SAME recipient logic as email notifications (getNotificationData)
 */
async function sendImmediatePushNotifications(params: {
	conversationId: string;
	websiteId: string;
	organizationId: string;
}): Promise<void> {
	try {
		// Use the SAME function as email notifications to get recipients
		const { websiteInfo, participants } = await getNotificationData(db, {
			conversationId: params.conversationId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
		});

		if (!websiteInfo || participants.length === 0) {
			console.log(
				`[push] No recipients for push notifications: websiteInfo=${!!websiteInfo}, participants=${participants.length}`
			);
			return;
		}

		// Get latest message for the notification content
		const latestMessage = await getLatestMessageForPush(db, {
			conversationId: params.conversationId,
			organizationId: params.organizationId,
		});

		if (!latestMessage) {
			console.log("[push] No message found for push notification");
			return;
		}

		console.log(
			`[push] Sending push notifications to ${participants.length} participants for conversation ${params.conversationId}`
		);

		// Send push notifications to the same recipients as email would use
		const pushPromises = participants.map((participant) =>
			sendMemberPushNotification({
				db,
				recipient: {
					kind: "member",
					userId: participant.userId,
					memberId: participant.memberId,
					email: participant.userEmail,
				},
				conversationId: params.conversationId,
				organizationId: params.organizationId,
				websiteInfo: {
					name: websiteInfo.name,
					slug: websiteInfo.slug,
					logo: websiteInfo.logo,
				},
				messagePreview: latestMessage.text,
				senderName: latestMessage.senderName,
			})
		);

		const results = await Promise.allSettled(pushPromises);
		const sent = results.filter(
			(r) => r.status === "fulfilled" && r.value.sent
		).length;
		console.log(
			`[push] Push notification results: ${sent}/${participants.length} sent successfully`
		);
	} catch (error) {
		// Don't throw - push notification failures shouldn't block message flow
		console.error(
			`[push] Failed to send immediate push notifications for conversation ${params.conversationId}:`,
			error
		);
	}
}

/**
 * Trigger notification workflow when a visitor sends a message
 * This notifies all conversation participants (team members)
 */
export async function triggerVisitorSentMessageWorkflow(params: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
}): Promise<void> {
	const data: VisitorSentMessageData = {
		conversationId: params.conversationId,
		messageId: params.messageId,
		websiteId: params.websiteId,
		organizationId: params.organizationId,
		visitorId: params.visitorId,
	};

	// Send immediate push notifications (don't await - fire and forget)
	// This ensures push notifications are sent instantly without blocking
	sendImmediatePushNotifications({
		conversationId: params.conversationId,
		websiteId: params.websiteId,
		organizationId: params.organizationId,
	}).catch((error) => {
		console.error("[push] Background push notification failed:", error);
	});

	try {
		// Fetch message metadata for deduplication
		const messageMetadata = await getMessageMetadata(db, {
			messageId: params.messageId,
			organizationId: params.organizationId,
		});

		if (!messageMetadata) {
			console.error(
				`[dev] Message ${params.messageId} not found, skipping notification workflow`
			);
			return;
		}

		console.log(
			`[dev] Triggering visitor-sent message workflow for conversation ${params.conversationId}`
		);

		const { workflowRunId, isReplacement } = await triggerDeduplicatedWorkflow({
			client: workflowClient,
			path: WORKFLOW.VISITOR_SENT_MESSAGE,
			data,
			conversationId: params.conversationId,
			direction: "visitor-to-member" as WorkflowDirection,
			messageId: params.messageId,
			messageCreatedAt: messageMetadata.createdAt,
		});

		console.log(
			`[dev] Visitor-sent message workflow ${isReplacement ? "replaced" : "triggered"} successfully for conversation ${params.conversationId}, workflowRunId: ${workflowRunId}`
		);
	} catch (error) {
		// Log errors but don't throw - we don't want to block message creation
		console.error(
			`[dev] Failed to trigger visitor-sent message workflow for conversation ${params.conversationId}:`,
			error
		);
	}
}

/**
 * Trigger AI agent response workflow when a visitor sends a message
 * This checks if an AI agent is configured and active for the website
 */
export async function triggerAiAgentResponseWorkflow(params: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
}): Promise<void> {
	try {
		// Check if there's an active AI agent for this website
		const aiAgent = await getActiveAiAgentForWebsite(db, {
			websiteId: params.websiteId,
			organizationId: params.organizationId,
		});

		if (!aiAgent) {
			// No active AI agent configured, skip
			return;
		}

		const data: AiAgentResponseData = {
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			aiAgentId: aiAgent.id,
			visitorId: params.visitorId,
		};

		// Fetch message metadata for deduplication
		const messageMetadata = await getMessageMetadata(db, {
			messageId: params.messageId,
			organizationId: params.organizationId,
		});

		if (!messageMetadata) {
			console.error(
				`[ai-agent] Message ${params.messageId} not found, skipping AI response workflow`
			);
			return;
		}

		console.log(
			`[ai-agent] Triggering AI agent response workflow for conversation ${params.conversationId}`
		);

		const { workflowRunId, isReplacement } = await triggerDeduplicatedWorkflow({
			client: workflowClient,
			path: WORKFLOW.AI_AGENT_RESPONSE,
			data,
			conversationId: params.conversationId,
			direction: "ai-agent-response" as WorkflowDirection,
			messageId: params.messageId,
			messageCreatedAt: messageMetadata.createdAt,
		});

		console.log(
			`[ai-agent] AI agent response workflow ${isReplacement ? "replaced" : "triggered"} successfully for conversation ${params.conversationId}, workflowRunId: ${workflowRunId}`
		);
	} catch (error) {
		// Log errors but don't throw - we don't want to block message creation
		console.error(
			`[ai-agent] Failed to trigger AI agent response workflow for conversation ${params.conversationId}:`,
			error
		);
	}
}

/**
 * Main function to trigger appropriate workflow based on message sender
 * Automatically determines which workflow to trigger based on the actor type
 */
export async function triggerMessageNotificationWorkflow(params: {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	actor:
		| { type: "user"; userId: string }
		| { type: "visitor"; visitorId: string }
		| { type: "aiAgent"; aiAgentId: string };
}): Promise<void> {
	console.log(
		`[dev] Triggering message notification workflow for actor type: ${params.actor.type}, messageId: ${params.messageId}, conversationId: ${params.conversationId}`
	);

	if (params.actor.type === "user") {
		// Member (user) sent a message -> notify other participants and visitor
		await triggerMemberSentMessageWorkflow({
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			senderId: params.actor.userId,
		});
	} else if (params.actor.type === "visitor") {
		// Visitor sent a message -> notify all team members
		await triggerVisitorSentMessageWorkflow({
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			visitorId: params.actor.visitorId,
		});

		// Also trigger AI agent response workflow (if configured)
		// This runs in parallel with notifications - fire and forget
		triggerAiAgentResponseWorkflow({
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			visitorId: params.actor.visitorId,
		}).catch((error) => {
			console.error("[ai-agent] Background AI agent workflow failed:", error);
		});
	} else if (params.actor.type === "aiAgent") {
		// AI agent sent a message -> treat as member message (notify visitor and participants)
		// For now, we skip AI agent messages as they might not need notifications
		// This can be implemented later if needed
		console.log(
			"[dev] AI agent messages are not configured for notifications yet"
		);
	}
}
