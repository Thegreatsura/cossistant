import { getRedis } from "@api/redis";
import type {
	MemberSentMessageData,
	VisitorSentMessageData,
	WorkflowDataMap,
} from "@api/workflows/types";
import type { Client } from "@upstash/workflow";

/**
 * Workflow deduplication manager using Redis
 * Ensures only one workflow runs per conversation and direction at a time
 * Stores the initial triggering message ID to filter email notifications correctly
 */

export type WorkflowDirection = "member-to-visitor" | "visitor-to-member";

export type WorkflowState = {
	workflowRunId: string;
	initialMessageId: string;
	initialMessageCreatedAt: string;
	conversationId: string;
	direction: WorkflowDirection;
	createdAt: string;
	updatedAt: string;
};

/**
 * Generate a stable Redis key for a workflow
 */
function getWorkflowKey(
	conversationId: string,
	direction: WorkflowDirection
): string {
	return `workflow:message:${conversationId}:${direction}`;
}

/**
 * Get the current workflow state from Redis
 */
export async function getWorkflowState(
	conversationId: string,
	direction: WorkflowDirection
): Promise<WorkflowState | null> {
	const redis = getRedis();
	const key = getWorkflowKey(conversationId, direction);
	const data = await redis.get(key);

	if (!data) {
		return null;
	}

	return JSON.parse(data as string) as WorkflowState;
}

/**
 * Set workflow state in Redis
 * TTL is set to 24 hours to auto-cleanup old workflows
 */
export async function setWorkflowState(
	state: WorkflowState,
	ttlSeconds = 86_400 // 24 hours
): Promise<void> {
	const redis = getRedis();
	const key = getWorkflowKey(state.conversationId, state.direction);
	await redis.setex(key, ttlSeconds, JSON.stringify(state));
}

/**
 * Clear workflow state from Redis
 */
export async function clearWorkflowState(
	conversationId: string,
	direction: WorkflowDirection
): Promise<void> {
	const redis = getRedis();
	const key = getWorkflowKey(conversationId, direction);
	await redis.del(key);
}

/**
 * Cancel a workflow run using Upstash client
 */
async function cancelWorkflow(
	client: Client,
	workflowRunId: string
): Promise<void> {
	try {
		await client.cancel({ ids: workflowRunId });
	} catch (error) {
		// Log but don't throw - workflow might already be completed
		console.warn(`Failed to cancel workflow ${workflowRunId}:`, error);
	}
}

/**
 * Trigger a deduplicated message workflow
 * Cancels any existing workflow for the same conversation/direction and replaces it
 * Returns the workflow run ID and whether this is a new workflow or a replacement
 */
export async function triggerDeduplicatedWorkflow<
	T extends keyof WorkflowDataMap,
>(params: {
	client: Client;
	path: T;
	data: WorkflowDataMap[T];
	url: string;
	conversationId: string;
	direction: WorkflowDirection;
	messageId: string;
	messageCreatedAt: string;
}): Promise<{ workflowRunId: string; isReplacement: boolean }> {
	const {
		client,
		path,
		data,
		url,
		conversationId,
		direction,
		messageId,
		messageCreatedAt,
	} = params;

	// Check for existing workflow
	const existingState = await getWorkflowState(conversationId, direction);

	if (existingState) {
		// Cancel the existing workflow
		await cancelWorkflow(client, existingState.workflowRunId);

		// Trigger new workflow with the ORIGINAL message ID as the anchor
		const { workflowRunId: newWorkflowRunId } = await client.trigger({
			url: `${url}/workflow/${path}`,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
			workflowRunId: `msg-notif-${conversationId}-${direction}-${Date.now()}`,
		});

		// Update state but keep the original message ID
		const newState: WorkflowState = {
			workflowRunId: newWorkflowRunId,
			initialMessageId: existingState.initialMessageId, // Keep original
			initialMessageCreatedAt: existingState.initialMessageCreatedAt, // Keep original
			conversationId,
			direction,
			createdAt: existingState.createdAt, // Keep original
			updatedAt: new Date().toISOString(),
		};

		await setWorkflowState(newState);

		return { workflowRunId: newWorkflowRunId, isReplacement: true };
	}

	// No existing workflow, create new one
	const { workflowRunId } = await client.trigger({
		url: `${url}/workflow/${path}`,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
		workflowRunId: `msg-notif-${conversationId}-${direction}-${Date.now()}`,
	});

	// Store state with this message as the initial trigger
	const newState: WorkflowState = {
		workflowRunId,
		initialMessageId: messageId,
		initialMessageCreatedAt: messageCreatedAt,
		conversationId,
		direction,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	await setWorkflowState(newState);

	return { workflowRunId, isReplacement: false };
}

/**
 * Check if a workflow run ID matches the current active workflow
 * Used by workflow handlers to determine if they should proceed
 */
export async function isActiveWorkflow(
	conversationId: string,
	direction: WorkflowDirection,
	workflowRunId: string
): Promise<boolean> {
	const state = await getWorkflowState(conversationId, direction);
	return state?.workflowRunId === workflowRunId;
}
