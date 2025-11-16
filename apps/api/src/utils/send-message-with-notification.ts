import { db } from "@api/db";
import { getMessageMetadata } from "@api/db/queries/conversation";
import { workflowClient } from "@api/utils/workflow";
import {
	triggerDeduplicatedWorkflow,
	type WorkflowDirection,
} from "@api/utils/workflow-dedup-manager";
import {
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
	} else if (params.actor.type === "aiAgent") {
		// AI agent sent a message -> treat as member message (notify visitor and participants)
		// For now, we skip AI agent messages as they might not need notifications
		// This can be implemented later if needed
		console.log(
			"[dev] AI agent messages are not configured for notifications yet"
		);
	}
}
