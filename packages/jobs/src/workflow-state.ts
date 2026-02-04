import type { Redis } from "@cossistant/redis";

export type WorkflowDirection =
	| "member-to-visitor"
	| "visitor-to-member"
	| "ai-agent-response";

export type WorkflowState = {
	workflowRunId: string;
	initialMessageId: string;
	initialMessageCreatedAt: string;
	conversationId: string;
	direction: WorkflowDirection;
	createdAt: string;
	updatedAt: string;
};

const WORKFLOW_STATE_TTL_SECONDS = 86_400; // 24h

function getWorkflowKey(
	conversationId: string,
	direction: WorkflowDirection
): string {
	return `workflow:message:${conversationId}:${direction}`;
}

export function generateWorkflowRunId(
	conversationId: string,
	direction: WorkflowDirection
): string {
	return `msg-workflow-${conversationId}-${direction}-${Date.now()}`;
}

export async function getWorkflowState(
	redis: Redis,
	conversationId: string,
	direction: WorkflowDirection
): Promise<WorkflowState | null> {
	const key = getWorkflowKey(conversationId, direction);
	const data = await redis.get(key);

	if (!data) {
		return null;
	}

	return JSON.parse(data as string) as WorkflowState;
}

export async function setWorkflowState(
	redis: Redis,
	state: WorkflowState,
	ttlSeconds = WORKFLOW_STATE_TTL_SECONDS
): Promise<void> {
	const key = getWorkflowKey(state.conversationId, state.direction);
	await redis.setex(key, ttlSeconds, JSON.stringify(state));
}

export async function clearWorkflowState(
	redis: Redis,
	conversationId: string,
	direction: WorkflowDirection
): Promise<void> {
	const key = getWorkflowKey(conversationId, direction);
	await redis.del(key);
}

export async function clearWorkflowStateIfActive(
	redis: Redis,
	conversationId: string,
	direction: WorkflowDirection,
	workflowRunId: string
): Promise<boolean> {
	const state = await getWorkflowState(redis, conversationId, direction);
	if (state?.workflowRunId !== workflowRunId) {
		return false;
	}

	await clearWorkflowState(redis, conversationId, direction);
	return true;
}

export async function isWorkflowRunActive(
	redis: Redis,
	conversationId: string,
	direction: WorkflowDirection,
	workflowRunId: string
): Promise<boolean> {
	const state = await getWorkflowState(redis, conversationId, direction);
	return state?.workflowRunId === workflowRunId;
}
