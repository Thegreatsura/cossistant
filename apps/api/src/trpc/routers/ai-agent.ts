import {
	createAiAgent,
	getAiAgentForWebsite,
	toggleAiAgentActive,
	updateAiAgent,
} from "@api/db/queries/ai-agent";
import { getWebsiteBySlugWithAccess } from "@api/db/queries/website";
import {
	aiAgentResponseSchema,
	createAiAgentRequestSchema,
	getAiAgentRequestSchema,
	toggleAiAgentActiveRequestSchema,
	updateAiAgentRequestSchema,
} from "@cossistant/types";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

function toAiAgentResponse(agent: {
	id: string;
	name: string;
	description: string | null;
	basePrompt: string;
	model: string;
	temperature: number | null;
	maxTokens: number | null;
	isActive: boolean;
	lastUsedAt: string | null;
	usageCount: number;
	createdAt: string;
	updatedAt: string;
}) {
	return {
		id: agent.id,
		name: agent.name,
		description: agent.description,
		basePrompt: agent.basePrompt,
		model: agent.model,
		temperature: agent.temperature,
		maxTokens: agent.maxTokens,
		isActive: agent.isActive,
		lastUsedAt: agent.lastUsedAt,
		usageCount: agent.usageCount,
		createdAt: agent.createdAt,
		updatedAt: agent.updatedAt,
	};
}

export const aiAgentRouter = createTRPCRouter({
	/**
	 * Get the AI agent for a website
	 * Returns null if no agent exists
	 */
	get: protectedProcedure
		.input(getAiAgentRequestSchema)
		.output(aiAgentResponseSchema.nullable())
		.query(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			const agent = await getAiAgentForWebsite(db, {
				websiteId: websiteData.id,
				organizationId: websiteData.organizationId,
			});

			if (!agent) {
				return null;
			}

			return toAiAgentResponse(agent);
		}),

	/**
	 * Create a new AI agent for a website
	 * Only one agent per website is allowed
	 */
	create: protectedProcedure
		.input(createAiAgentRequestSchema)
		.output(aiAgentResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			// Check if an agent already exists for this website
			const existingAgent = await getAiAgentForWebsite(db, {
				websiteId: websiteData.id,
				organizationId: websiteData.organizationId,
			});

			if (existingAgent) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An AI agent already exists for this website",
				});
			}

			const agent = await createAiAgent(db, {
				name: input.name,
				description: input.description,
				basePrompt: input.basePrompt,
				model: input.model,
				temperature: input.temperature,
				maxTokens: input.maxTokens,
				organizationId: websiteData.organizationId,
				websiteId: websiteData.id,
			});

			return toAiAgentResponse(agent);
		}),

	/**
	 * Update an existing AI agent
	 */
	update: protectedProcedure
		.input(updateAiAgentRequestSchema)
		.output(aiAgentResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			const agent = await updateAiAgent(db, {
				aiAgentId: input.aiAgentId,
				name: input.name,
				description: input.description,
				basePrompt: input.basePrompt,
				model: input.model,
				temperature: input.temperature,
				maxTokens: input.maxTokens,
			});

			if (!agent) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "AI agent not found",
				});
			}

			return toAiAgentResponse(agent);
		}),

	/**
	 * Toggle an AI agent's active status
	 */
	toggleActive: protectedProcedure
		.input(toggleAiAgentActiveRequestSchema)
		.output(aiAgentResponseSchema)
		.mutation(async ({ ctx: { db, user }, input }) => {
			const websiteData = await getWebsiteBySlugWithAccess(db, {
				userId: user.id,
				websiteSlug: input.websiteSlug,
			});

			if (!websiteData) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Website not found or access denied",
				});
			}

			const agent = await toggleAiAgentActive(db, {
				aiAgentId: input.aiAgentId,
				isActive: input.isActive,
			});

			if (!agent) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "AI agent not found",
				});
			}

			return toAiAgentResponse(agent);
		}),
});
