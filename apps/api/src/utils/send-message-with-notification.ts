import { env } from "@api/env";
import type {
	MemberSentMessageData,
	VisitorSentMessageData,
} from "@api/workflows/types";
import { WORKFLOW } from "@api/workflows/types";
import { Client } from "@upstash/workflow";

// Initialize Upstash Workflow client
const workflowClient = new Client({ token: env.QSTASH_TOKEN });

/**
 * Get the base URL for workflow endpoints
 * In production, use BETTER_AUTH_URL or construct from PUBLIC_APP_URL
 * In development, use localhost with the configured port
 */
function getWorkflowBaseUrl(): string {
	if (env.NODE_ENV === "production") {
		// Use BETTER_AUTH_URL if available, otherwise construct from PUBLIC_APP_URL
		if (env.BETTER_AUTH_URL) {
			return env.BETTER_AUTH_URL;
		}
		// Fallback: construct API URL from app URL
		const appUrl = env.PUBLIC_APP_URL;
		return appUrl.replace("app.", "api.");
	}

	// Development: use localhost with configured port
	return `http://localhost:${env.PORT}`;
}

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
	try {
		const baseUrl = getWorkflowBaseUrl();
		const workflowUrl = `${baseUrl}/workflows/message/member-sent`;

		// Use deterministic workflow ID for message grouping
		const workflowRunId = `conversation-${params.conversationId}-member-notification`;

		const payload: MemberSentMessageData = {
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			senderId: params.senderId,
		};

		console.log(
			`[dev] Triggering member-sent message workflow for conversation ${params.conversationId}`
		);
		console.log(`[dev] Workflow URL: ${workflowUrl}`);
		console.log(`[dev] Workflow Run ID: ${workflowRunId}`);

		const result = await workflowClient.trigger({
			url: workflowUrl,
			body: payload,
			workflowRunId,
			retries: 3,
		});

		console.log(
			`[dev] Member-sent message workflow triggered successfully: ${result.workflowRunId}`
		);
	} catch (error) {
		// Log error but don't throw - we don't want to block message creation
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
	try {
		const baseUrl = getWorkflowBaseUrl();
		const workflowUrl = `${baseUrl}/workflows/message/visitor-sent`;

		// Use deterministic workflow ID for message grouping
		const workflowRunId = `conversation-${params.conversationId}-visitor-notification`;

		const payload: VisitorSentMessageData = {
			conversationId: params.conversationId,
			messageId: params.messageId,
			websiteId: params.websiteId,
			organizationId: params.organizationId,
			visitorId: params.visitorId,
		};

		console.log(
			`[dev] Triggering visitor-sent message workflow for conversation ${params.conversationId}`
		);
		console.log(`[dev] Workflow URL: ${workflowUrl}`);
		console.log(`[dev] Workflow Run ID: ${workflowRunId}`);

		const result = await workflowClient.trigger({
			url: workflowUrl,
			body: payload,
			workflowRunId,
			retries: 3,
		});

		console.log(
			`[dev] Visitor-sent message workflow triggered successfully: ${result.workflowRunId}`
		);
	} catch (error) {
		// Log error but don't throw - we don't want to block message creation
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
		`[dev] Triggering message notification workflow for actor type: ${params.actor.type}`
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
