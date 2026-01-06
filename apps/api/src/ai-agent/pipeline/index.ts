/**
 * AI Agent Pipeline Orchestrator
 *
 * This module orchestrates the 5-step AI agent processing pipeline.
 * Each step is isolated and can be tested independently.
 *
 * Pipeline Steps:
 * 1. Intake - Gather context, validate agent is active
 * 2. Decision - Determine if/how AI should respond
 * 3. Generation - Generate response using LLM with structured output
 * 4. Execution - Execute chosen actions (DB writes)
 * 5. Followup - Post-processing, cleanup, emit events
 */

import type { Database } from "@api/db";
import type { Redis } from "@cossistant/redis";
import { type IntakeResult, intake } from "./1-intake";
import { type DecisionResult, decide } from "./2-decision";
import { type GenerationResult, generate } from "./3-generation";
import { type ExecutionResult, execute } from "./4-execution";
import { followup } from "./5-followup";

export type AiAgentPipelineInput = {
	conversationId: string;
	messageId: string;
	messageCreatedAt: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
	aiAgentId: string;
	workflowRunId: string;
	jobId: string;
};

export type AiAgentPipelineResult = {
	status: "completed" | "skipped" | "error";
	action?: string;
	reason?: string;
	error?: string;
	metrics: {
		intakeMs: number;
		decisionMs: number;
		generationMs: number;
		executionMs: number;
		followupMs: number;
		totalMs: number;
	};
};

type PipelineContext = {
	db: Database;
	redis: Redis;
	input: AiAgentPipelineInput;
};

/**
 * Run the AI agent pipeline
 *
 * This is the main entry point called by the BullMQ worker.
 * It orchestrates all 5 steps and handles errors gracefully.
 */
export async function runAiAgentPipeline(
	ctx: PipelineContext
): Promise<AiAgentPipelineResult> {
	const startTime = Date.now();
	const metrics = {
		intakeMs: 0,
		decisionMs: 0,
		generationMs: 0,
		executionMs: 0,
		followupMs: 0,
		totalMs: 0,
	};

	let intakeResult: IntakeResult | null = null;
	let decisionResult: DecisionResult | null = null;
	let generationResult: GenerationResult | null = null;
	let executionResult: ExecutionResult | null = null;

	try {
		// Step 1: Intake - Gather context and validate
		const intakeStart = Date.now();
		intakeResult = await intake(ctx.db, ctx.input);
		metrics.intakeMs = Date.now() - intakeStart;

		if (intakeResult.status !== "ready") {
			return {
				status: "skipped",
				reason: intakeResult.reason,
				metrics: finalizeMetrics(metrics, startTime),
			};
		}

		// Step 2: Decision - Should AI act?
		const decisionStart = Date.now();
		decisionResult = await decide({
			aiAgent: intakeResult.aiAgent,
			conversation: intakeResult.conversation,
			conversationHistory: intakeResult.conversationHistory,
			conversationState: intakeResult.conversationState,
			triggerMessage: intakeResult.triggerMessage,
		});
		metrics.decisionMs = Date.now() - decisionStart;

		if (!decisionResult.shouldAct) {
			return {
				status: "skipped",
				reason: decisionResult.reason,
				metrics: finalizeMetrics(metrics, startTime),
			};
		}

		// Step 3: Generation - Call LLM
		const generationStart = Date.now();
		generationResult = await generate({
			aiAgent: intakeResult.aiAgent,
			conversation: intakeResult.conversation,
			conversationHistory: intakeResult.conversationHistory,
			visitorContext: intakeResult.visitorContext,
			mode: decisionResult.mode,
			humanCommand: decisionResult.humanCommand,
		});
		metrics.generationMs = Date.now() - generationStart;

		// Step 4: Execution - Execute actions
		const executionStart = Date.now();
		executionResult = await execute({
			db: ctx.db,
			aiAgent: intakeResult.aiAgent,
			conversation: intakeResult.conversation,
			decision: generationResult.decision,
			jobId: ctx.input.jobId,
			organizationId: ctx.input.organizationId,
			websiteId: ctx.input.websiteId,
			visitorId: ctx.input.visitorId,
		});
		metrics.executionMs = Date.now() - executionStart;

		// Step 5: Followup - Cleanup and emit events
		const followupStart = Date.now();
		await followup({
			db: ctx.db,
			redis: ctx.redis,
			aiAgent: intakeResult.aiAgent,
			conversation: intakeResult.conversation,
			decision: generationResult.decision,
			executionResult,
			workflowRunId: ctx.input.workflowRunId,
		});
		metrics.followupMs = Date.now() - followupStart;

		return {
			status: "completed",
			action: generationResult.decision.action,
			metrics: finalizeMetrics(metrics, startTime),
		};
	} catch (error) {
		// Ensure typing indicator is cleared on error
		if (intakeResult?.status === "ready") {
			try {
				await followup({
					db: ctx.db,
					redis: ctx.redis,
					aiAgent: intakeResult.aiAgent,
					conversation: intakeResult.conversation,
					decision: null,
					executionResult: null,
					workflowRunId: ctx.input.workflowRunId,
				});
			} catch {
				// Ignore cleanup errors
			}
		}

		return {
			status: "error",
			error: error instanceof Error ? error.message : "Unknown error",
			metrics: finalizeMetrics(metrics, startTime),
		};
	}
}

function finalizeMetrics(
	metrics: AiAgentPipelineResult["metrics"],
	startTime: number
): AiAgentPipelineResult["metrics"] {
	return {
		...metrics,
		totalMs: Date.now() - startTime,
	};
}
