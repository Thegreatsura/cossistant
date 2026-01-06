/**
 * Pipeline Step 5: Followup
 *
 * This step handles post-processing tasks after the main action is executed.
 *
 * Responsibilities:
 * - Update AI agent usage statistics
 * - Clear typing indicator
 * - Clear workflow state
 * - Emit realtime events
 * - Run background analysis (sentiment, title generation)
 */

import type { Database } from "@api/db";
import { updateAiAgentUsage } from "@api/db/queries/ai-agent";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
import { emitConversationTypingEvent } from "@api/utils/conversation-realtime";
import {
	clearWorkflowState,
	type WorkflowDirection,
} from "@cossistant/jobs/workflow-state";
import type { Redis } from "@cossistant/redis";
import * as analysis from "../analysis";
import type { AiDecision } from "../output/schemas";
import { getBehaviorSettings } from "../settings";
import type { ExecutionResult } from "./4-execution";

const AI_AGENT_DIRECTION: WorkflowDirection = "ai-agent-response";

type FollowupInput = {
	db: Database;
	redis: Redis;
	aiAgent: AiAgentSelect;
	conversation: ConversationSelect;
	decision: AiDecision | null;
	executionResult: ExecutionResult | null;
	workflowRunId: string;
};

/**
 * Execute post-processing tasks
 */
export async function followup(input: FollowupInput): Promise<void> {
	const {
		db,
		redis,
		aiAgent,
		conversation,
		decision,
		executionResult,
		workflowRunId,
	} = input;

	// Always clear typing indicator
	await emitConversationTypingEvent({
		conversation,
		actor: { type: "ai_agent", aiAgentId: aiAgent.id },
		isTyping: false,
	});

	// Always clear workflow state
	await clearWorkflowState(redis, conversation.id, AI_AGENT_DIRECTION);

	// If there was a successful action, update usage stats
	if (executionResult?.primaryAction.success && decision?.action !== "skip") {
		await updateAiAgentUsage(db, { aiAgentId: aiAgent.id });
	}

	// Run background analysis if configured
	const settings = getBehaviorSettings(aiAgent);
	await runBackgroundAnalysis(db, conversation, aiAgent, settings);
}

/**
 * Run background analysis tasks based on settings
 */
async function runBackgroundAnalysis(
	db: Database,
	conversation: ConversationSelect,
	aiAgent: AiAgentSelect,
	settings: ReturnType<typeof getBehaviorSettings>
): Promise<void> {
	const analysisPromises: Promise<void>[] = [];

	// Analyze sentiment if enabled and not already analyzed recently
	if (settings.autoAnalyzeSentiment) {
		analysisPromises.push(
			analysis
				.analyzeSentiment({
					db,
					conversation,
					aiAgentId: aiAgent.id,
				})
				.catch((error) => {
					console.error(
						`[ai-agent] Sentiment analysis failed for conversation ${conversation.id}:`,
						error
					);
				})
		);
	}

	// Generate title if enabled and conversation doesn't have one
	if (settings.autoGenerateTitle && !conversation.title) {
		analysisPromises.push(
			analysis
				.generateTitle({
					db,
					conversation,
					aiAgentId: aiAgent.id,
				})
				.catch((error) => {
					console.error(
						`[ai-agent] Title generation failed for conversation ${conversation.id}:`,
						error
					);
				})
		);
	}

	// Auto-categorize if enabled
	if (settings.autoCategorize) {
		analysisPromises.push(
			analysis
				.autoCategorize({
					db,
					conversation,
					aiAgentId: aiAgent.id,
				})
				.catch((error) => {
					console.error(
						`[ai-agent] Auto-categorization failed for conversation ${conversation.id}:`,
						error
					);
				})
		);
	}

	// Run all analysis tasks in parallel (fire and forget)
	await Promise.allSettled(analysisPromises);
}
