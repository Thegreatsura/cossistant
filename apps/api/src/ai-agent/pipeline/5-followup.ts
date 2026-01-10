/**
 * Pipeline Step 5: Followup
 *
 * This step handles post-processing tasks after the main action is executed.
 *
 * Responsibilities:
 * - Update AI agent usage statistics
 * - Clear workflow state
 * - Emit realtime events
 * - Run background analysis (sentiment, title generation)
 *
 * Note: Typing indicator is managed by the pipeline orchestrator (index.ts)
 */

import type { Database } from "@api/db";
import { updateAiAgentUsage } from "@api/db/queries/ai-agent";
import type { AiAgentSelect } from "@api/db/schema/ai-agent";
import type { ConversationSelect } from "@api/db/schema/conversation";
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
	organizationId: string;
	websiteId: string;
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
		organizationId,
		websiteId,
	} = input;

	// Clear workflow state
	await clearWorkflowState(redis, conversation.id, AI_AGENT_DIRECTION);

	// If there was a successful action, update usage stats
	if (executionResult?.primaryAction.success && decision?.action !== "skip") {
		await updateAiAgentUsage(db, { aiAgentId: aiAgent.id });
	}

	// Run background analysis if configured
	const settings = getBehaviorSettings(aiAgent);
	await runBackgroundAnalysis({
		db,
		conversation,
		aiAgent,
		settings,
		organizationId,
		websiteId,
	});
}

type BackgroundAnalysisInput = {
	db: Database;
	conversation: ConversationSelect;
	aiAgent: AiAgentSelect;
	settings: ReturnType<typeof getBehaviorSettings>;
	organizationId: string;
	websiteId: string;
};

/**
 * Run background analysis tasks based on settings
 */
async function runBackgroundAnalysis(
	params: BackgroundAnalysisInput
): Promise<void> {
	const { db, conversation, aiAgent, settings, organizationId, websiteId } =
		params;
	const analysisPromises: Promise<void>[] = [];
	const convId = conversation.id;

	// Log what analysis tasks will run
	const tasks: string[] = [];
	if (settings.autoAnalyzeSentiment) {
		tasks.push("sentiment");
	}
	if (settings.autoGenerateTitle && !conversation.title) {
		tasks.push("title");
	}
	if (settings.autoCategorize) {
		tasks.push("categorize");
	}

	if (tasks.length > 0) {
		console.log(
			`[ai-agent:followup] conv=${convId} | Running analysis: ${tasks.join(", ")}`
		);
	}

	// Analyze sentiment if enabled and not already analyzed recently
	if (settings.autoAnalyzeSentiment) {
		analysisPromises.push(
			analysis
				.analyzeSentiment({
					db,
					conversation,
					organizationId,
					websiteId,
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
					organizationId,
					websiteId,
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
