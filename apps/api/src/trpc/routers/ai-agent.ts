import {
	createAiAgent,
	getAiAgentForWebsite,
	toggleAiAgentActive,
	updateAiAgent,
} from "@api/db/queries/ai-agent";
import {
	getWebsiteBySlugWithAccess,
	updateWebsite,
} from "@api/db/queries/website";
import { firecrawlService } from "@api/services/firecrawl";
import { generateAgentBasePrompt } from "@api/services/prompt-generator";
import {
	aiAgentResponseSchema,
	createAiAgentRequestSchema,
	generateBasePromptRequestSchema,
	generateBasePromptResponseSchema,
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
	goals: string[] | null;
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
		goals: agent.goals,
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
				goals: input.goals,
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
				goals: input.goals,
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

	/**
	 * Generate a base prompt by scraping a website and using AI
	 * This endpoint:
	 * 1. Optionally scrapes the provided URL for content and brand information
	 * 2. Uses manualDescription if provided (takes priority over scraped)
	 * 3. Updates the website.description if we got one
	 * 4. Generates a tailored base prompt using AI
	 * 5. Returns the prompt along with extracted brand data
	 */
	generateBasePrompt: protectedProcedure
		.input(generateBasePromptRequestSchema)
		.output(generateBasePromptResponseSchema)
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

			// Initialize variables for scraped data
			let brandInfo: Awaited<
				ReturnType<typeof firecrawlService.extractBrandInfo>
			> | null = null;
			let mapResult: Awaited<
				ReturnType<typeof firecrawlService.mapSite>
			> | null = null;

			// Only scrape if URL is provided
			if (input.sourceUrl) {
				// Run brand extraction (which scrapes internally) and site mapping in parallel
				// extractBrandInfo returns company name, description, logo, favicon, AND markdown content
				[brandInfo, mapResult] = await Promise.all([
					firecrawlService.extractBrandInfo(input.sourceUrl),
					firecrawlService.mapSite(input.sourceUrl, { limit: 100 }),
				]);

				// Log what Firecrawl returned for debugging
				console.log("[generateBasePrompt] Firecrawl brandInfo:", {
					success: brandInfo?.success,
					companyName: brandInfo?.companyName,
					description: brandInfo?.description?.substring(0, 150),
					hasMarkdown: !!brandInfo?.markdown,
					markdownLength: brandInfo?.markdown?.length ?? 0,
					error: brandInfo?.error,
				});
				console.log("[generateBasePrompt] Firecrawl mapResult:", {
					success: mapResult?.success,
					urlsCount: mapResult?.urls?.length ?? 0,
					error: mapResult?.error,
				});
			}

			// Determine description: manual > scraped > null
			// Manual description takes priority
			const websiteDescription =
				input.manualDescription ?? brandInfo?.description ?? null;

			console.log("[generateBasePrompt] Description resolution:", {
				manualDescription: input.manualDescription?.substring(0, 100),
				brandInfoDescription: brandInfo?.description?.substring(0, 100),
				finalDescription: websiteDescription?.substring(0, 100),
			});

			// Update the website description if we have one and it's not already set
			if (websiteDescription && !websiteData.description) {
				console.log("[generateBasePrompt] Saving description to website:", {
					websiteId: websiteData.id,
					descriptionLength: websiteDescription.length,
				});
				try {
					await updateWebsite(db, {
						orgId: websiteData.organizationId,
						websiteId: websiteData.id,
						data: {
							description: websiteDescription,
						},
					});
					console.log(
						"[generateBasePrompt] Website description saved successfully"
					);
				} catch (error) {
					// Log but don't fail - updating description is nice-to-have
					console.error(
						"[generateBasePrompt] Failed to update website description:",
						error
					);
				}
			} else if (websiteDescription && websiteData.description) {
				console.log(
					"[generateBasePrompt] Website already has description, skipping update"
				);
			} else {
				console.log("[generateBasePrompt] No description to save");
			}

			// Generate the base prompt using AI
			const promptOptions = {
				brandInfo: {
					success: brandInfo?.success ?? false,
					companyName: brandInfo?.companyName ?? websiteData.name,
					description: websiteDescription ?? undefined,
					logo: brandInfo?.logo,
					favicon: brandInfo?.favicon,
					language: brandInfo?.language,
					keywords: brandInfo?.keywords,
				},
				content: brandInfo?.markdown,
				goals: input.goals,
				agentName: input.agentName,
				domain: websiteData.domain,
			};

			console.log("[generateBasePrompt] Calling prompt generator with:", {
				companyName: promptOptions.brandInfo.companyName,
				description: promptOptions.brandInfo.description?.substring(0, 100),
				hasContent: !!promptOptions.content,
				contentLength: promptOptions.content?.length ?? 0,
				goals: promptOptions.goals,
				agentName: promptOptions.agentName,
				domain: promptOptions.domain,
			});

			const promptResult = await generateAgentBasePrompt(promptOptions);

			return {
				basePrompt: promptResult.prompt,
				isGenerated: promptResult.isGenerated,
				companyName: brandInfo?.companyName ?? websiteData.name,
				websiteDescription,
				logo: brandInfo?.logo ?? null,
				favicon: brandInfo?.favicon ?? null,
				discoveredLinksCount: mapResult?.success
					? (mapResult.urls?.length ?? 0)
					: 0,
			};
		}),
});
