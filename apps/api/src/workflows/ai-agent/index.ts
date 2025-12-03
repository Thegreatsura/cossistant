import { db } from "@api/db";
import { markConversationAsSeen } from "@api/db/mutations/conversation";
import { getAiAgentById, updateAiAgentUsage } from "@api/db/queries/ai-agent";
import { getConversationById } from "@api/db/queries/conversation";
import {
	emitConversationSeenEvent,
	emitConversationTypingEvent,
} from "@api/utils/conversation-realtime";
import { createMessageTimelineItem } from "@api/utils/timeline-item";
import { getWorkflowUrl } from "@api/utils/workflow";
import {
	clearWorkflowState,
	getWorkflowState,
	isActiveWorkflow,
	type WorkflowDirection,
} from "@api/utils/workflow-dedup-manager";
import type { AiAgentResponseData } from "@api/workflows/types";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";
import { generateAIResponse } from "./ai-generator";
import {
	buildConversationHistory,
	buildVisitorContextPrompt,
	getVisitorContextInfo,
} from "./context-builder";
import { getToolsForAgent } from "./tools";

/**
 * AI Agent Response Workflow
 *
 * This workflow handles AI agent responses to visitor messages.
 * It's designed to minimize Upstash Workflow steps (charged per step).
 *
 * Steps (3 total):
 * 1. Setup - Validate payload, check if workflow is still active
 * 2. Sleep - Debounce to batch multiple visitor messages
 * 3. Process - Generate AI response and send message (all in one step)
 */

// Debounce delay for batching multiple visitor messages (in seconds)
const AI_RESPONSE_DEBOUNCE_SECONDS = 5;

const aiAgentWorkflow = new Hono();

aiAgentWorkflow.post(
	"/respond",
	serve<AiAgentResponseData>(
		async (context) => {
			const direction: WorkflowDirection = "ai-agent-response";

			// Step 1: Setup - validate and fetch AI agent config
			const setup = await context.run("setup", async () => {
				const requestPayload =
					context.requestPayload as AiAgentResponseData | null;
				const runId: string | undefined =
					context.headers.get("upstash-workflow-runid") ?? undefined;

				if (!requestPayload) {
					console.error("[ai-agent] Missing payload in workflow");
					return { status: "missing" as const };
				}

				// Check if this workflow is still the active one
				if (runId) {
					const active = await isActiveWorkflow(
						requestPayload.conversationId,
						direction,
						runId
					);

					if (!active) {
						console.log(
							`[ai-agent] Workflow ${runId} is no longer active for ${requestPayload.conversationId}, exiting`
						);
						return { status: "inactive" as const };
					}
				}

				// Get workflow state for initial message tracking
				const state = await getWorkflowState(
					requestPayload.conversationId,
					direction
				);

				if (!state) {
					console.error(
						`[ai-agent] No workflow state found for ${requestPayload.conversationId}`
					);
					return { status: "no-state" as const };
				}

				// Fetch AI agent configuration
				const agent = await getAiAgentById(db, {
					aiAgentId: requestPayload.aiAgentId,
				});

				if (!agent) {
					console.error(
						`[ai-agent] AI agent not found: ${requestPayload.aiAgentId}`
					);
					return { status: "agent-not-found" as const };
				}

				if (!agent.isActive) {
					console.log(
						`[ai-agent] AI agent ${requestPayload.aiAgentId} is not active`
					);
					return { status: "agent-inactive" as const };
				}

				// Fetch conversation to verify it exists
				const conversationRecord = await getConversationById(db, {
					conversationId: requestPayload.conversationId,
				});

				if (!conversationRecord) {
					console.error(
						`[ai-agent] Conversation not found: ${requestPayload.conversationId}`
					);
					return { status: "conversation-not-found" as const };
				}

				return {
					status: "ok" as const,
					payload: requestPayload,
					aiAgent: agent,
					conversation: conversationRecord,
					workflowState: state,
					workflowRunId: runId,
				};
			});

			// Exit early if setup failed
			if (setup.status !== "ok") {
				return;
			}

			const { payload, aiAgent, conversation, workflowState } = setup;

			// Step 2: Sleep - debounce for message batching
			await context.sleep("debounce", AI_RESPONSE_DEBOUNCE_SECONDS);

			// Step 3: Process - all operations in one step to minimize costs
			await context.run("generate-response", async () => {
				// Mark conversation as seen by AI agent
				const lastSeenAt = await markConversationAsSeen(db, {
					conversation,
					actor: { type: "aiAgent", aiAgentId: aiAgent.id },
				});

				// Emit seen event
				await emitConversationSeenEvent({
					conversation,
					actor: { type: "ai_agent", aiAgentId: aiAgent.id },
					lastSeenAt,
				});

				// Emit typing indicator
				await emitConversationTypingEvent({
					conversation,
					actor: { type: "ai_agent", aiAgentId: aiAgent.id },
					isTyping: true,
				});

				try {
					// Build conversation context
					const [conversationHistory, visitorInfo] = await Promise.all([
						buildConversationHistory(db, {
							conversationId: payload.conversationId,
							websiteId: payload.websiteId,
							organizationId: payload.organizationId,
							visitorId: payload.visitorId,
						}),
						getVisitorContextInfo(db, payload.visitorId),
					]);

					// Build system prompt with visitor context
					const visitorContextPrompt = buildVisitorContextPrompt(visitorInfo);
					const enhancedAgent = {
						...aiAgent,
						basePrompt: aiAgent.basePrompt + visitorContextPrompt,
					};

					// Get tools based on agent configuration
					const tools = getToolsForAgent(
						aiAgent.metadata as Record<string, unknown> | null
					);

					// Generate AI response
					const result = await generateAIResponse({
						aiAgent: enhancedAgent,
						conversationHistory,
						tools,
					});

					// Create message timeline item
					await createMessageTimelineItem({
						db,
						organizationId: payload.organizationId,
						websiteId: payload.websiteId,
						conversationId: payload.conversationId,
						conversationOwnerVisitorId: payload.visitorId,
						text: result.text,
						aiAgentId: aiAgent.id,
						userId: null,
						visitorId: null,
						// Don't trigger notification workflow for AI messages to visitors
						// (visitor is already in the conversation)
						triggerNotificationWorkflow: false,
					});

					// Update AI agent usage stats
					await updateAiAgentUsage(db, { aiAgentId: aiAgent.id });

					console.log(
						`[ai-agent] Generated response for conversation ${payload.conversationId}`,
						{
							aiAgentId: aiAgent.id,
							tokensUsed: result.usage?.totalTokens,
						}
					);
				} finally {
					// Always clear typing indicator, even on error
					await emitConversationTypingEvent({
						conversation,
						actor: { type: "ai_agent", aiAgentId: aiAgent.id },
						isTyping: false,
					});

					// Clean up workflow state
					await clearWorkflowState(payload.conversationId, direction);
				}
			});
		},
		{
			url: getWorkflowUrl("AI_AGENT_RESPONSE"),
		}
	)
);

export default aiAgentWorkflow;
