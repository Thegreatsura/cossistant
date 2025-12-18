import { z } from "@hono/zod-openapi";

/**
 * Available AI models from OpenRouter
 */
export const AI_MODELS = [
	{
		value: "openai/gpt-5.1-chat",
		label: "GPT-5.1",
		provider: "OpenAI",
	},
	{
		value: "openai/gpt-5-mini",
		label: "GPT-5 Mini",
		provider: "OpenAI",
	},
	{
		value: "google/gemini-3-flash-preview",
		label: "Gemini 3 Flash",
		provider: "Google",
	},
] as const;

export type AIModel = (typeof AI_MODELS)[number]["value"];

/**
 * AI Agent response schema
 */
export const aiAgentResponseSchema = z.object({
	id: z.ulid().openapi({
		description: "The AI agent's unique identifier.",
		example: "01JG000000000000000000000",
	}),
	name: z.string().openapi({
		description: "The AI agent's display name.",
		example: "Support Assistant",
	}),
	description: z.string().nullable().openapi({
		description: "A brief description of the AI agent's purpose.",
		example: "Helps users with common support questions.",
	}),
	basePrompt: z.string().openapi({
		description: "The system prompt that defines the AI agent's behavior.",
		example: "You are a helpful support assistant...",
	}),
	model: z.string().openapi({
		description: "The OpenRouter model identifier.",
		example: "anthropic/claude-sonnet-4-20250514",
	}),
	temperature: z.number().nullable().openapi({
		description: "The temperature setting for response generation (0-2).",
		example: 0.7,
	}),
	maxTokens: z.number().nullable().openapi({
		description: "Maximum tokens for response generation.",
		example: 1024,
	}),
	isActive: z.boolean().openapi({
		description: "Whether the AI agent is currently active.",
		example: true,
	}),
	lastUsedAt: z.string().nullable().openapi({
		description: "When the AI agent was last used.",
		example: "2024-01-01T00:00:00.000Z",
	}),
	usageCount: z.number().openapi({
		description: "Total number of times the AI agent has been used.",
		example: 42,
	}),
	createdAt: z.string().openapi({
		description: "When the AI agent was created.",
		example: "2024-01-01T00:00:00.000Z",
	}),
	updatedAt: z.string().openapi({
		description: "When the AI agent was last updated.",
		example: "2024-01-01T00:00:00.000Z",
	}),
});

/**
 * Create AI Agent request schema
 */
export const createAiAgentRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug to create the AI agent for.",
			example: "my-website",
		}),
		name: z
			.string()
			.min(1, { message: "Name is required." })
			.max(100, { message: "Name must be 100 characters or fewer." })
			.openapi({
				description: "The AI agent's display name.",
				example: "Support Assistant",
			}),
		description: z
			.string()
			.max(500, { message: "Description must be 500 characters or fewer." })
			.optional()
			.openapi({
				description: "A brief description of the AI agent's purpose.",
				example: "Helps users with common support questions.",
			}),
		basePrompt: z
			.string()
			.min(1, { message: "Base prompt is required." })
			.max(10_000, {
				message: "Base prompt must be 10,000 characters or fewer.",
			})
			.openapi({
				description: "The system prompt that defines the AI agent's behavior.",
				example: "You are a helpful support assistant...",
			}),
		model: z.string().min(1, { message: "Model is required." }).openapi({
			description: "The OpenRouter model identifier.",
			example: "anthropic/claude-sonnet-4-20250514",
		}),
		temperature: z
			.number()
			.min(0, { message: "Temperature must be at least 0." })
			.max(2, { message: "Temperature must be at most 2." })
			.optional()
			.openapi({
				description: "The temperature setting for response generation (0-2).",
				example: 0.7,
			}),
		maxTokens: z
			.number()
			.min(100, { message: "Max tokens must be at least 100." })
			.max(16_000, { message: "Max tokens must be at most 16,000." })
			.optional()
			.openapi({
				description: "Maximum tokens for response generation.",
				example: 1024,
			}),
	})
	.openapi({
		description: "Payload used to create a new AI agent.",
	});

/**
 * Update AI Agent request schema
 */
export const updateAiAgentRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug.",
			example: "my-website",
		}),
		aiAgentId: z.ulid().openapi({
			description: "The AI agent's unique identifier.",
			example: "01JG000000000000000000000",
		}),
		name: z
			.string()
			.min(1, { message: "Name is required." })
			.max(100, { message: "Name must be 100 characters or fewer." })
			.openapi({
				description: "The AI agent's display name.",
				example: "Support Assistant",
			}),
		description: z
			.string()
			.max(500, { message: "Description must be 500 characters or fewer." })
			.nullable()
			.optional()
			.openapi({
				description: "A brief description of the AI agent's purpose.",
				example: "Helps users with common support questions.",
			}),
		basePrompt: z
			.string()
			.min(1, { message: "Base prompt is required." })
			.max(10_000, {
				message: "Base prompt must be 10,000 characters or fewer.",
			})
			.openapi({
				description: "The system prompt that defines the AI agent's behavior.",
				example: "You are a helpful support assistant...",
			}),
		model: z.string().min(1, { message: "Model is required." }).openapi({
			description: "The OpenRouter model identifier.",
			example: "anthropic/claude-sonnet-4-20250514",
		}),
		temperature: z
			.number()
			.min(0, { message: "Temperature must be at least 0." })
			.max(2, { message: "Temperature must be at most 2." })
			.nullable()
			.optional()
			.openapi({
				description: "The temperature setting for response generation (0-2).",
				example: 0.7,
			}),
		maxTokens: z
			.number()
			.min(100, { message: "Max tokens must be at least 100." })
			.max(16_000, { message: "Max tokens must be at most 16,000." })
			.nullable()
			.optional()
			.openapi({
				description: "Maximum tokens for response generation.",
				example: 1024,
			}),
	})
	.openapi({
		description: "Payload used to update an existing AI agent.",
	});

/**
 * Toggle AI Agent active status request schema
 */
export const toggleAiAgentActiveRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug.",
			example: "my-website",
		}),
		aiAgentId: z.ulid().openapi({
			description: "The AI agent's unique identifier.",
			example: "01JG000000000000000000000",
		}),
		isActive: z.boolean().openapi({
			description: "Whether the AI agent should be active.",
			example: true,
		}),
	})
	.openapi({
		description: "Payload used to toggle an AI agent's active status.",
	});

/**
 * Get AI Agent request schema
 */
export const getAiAgentRequestSchema = z
	.object({
		websiteSlug: z.string().openapi({
			description: "The website slug.",
			example: "my-website",
		}),
	})
	.openapi({
		description: "Request to get the AI agent for a website.",
	});

export type AiAgentResponse = z.infer<typeof aiAgentResponseSchema>;
export type CreateAiAgentRequest = z.infer<typeof createAiAgentRequestSchema>;
export type UpdateAiAgentRequest = z.infer<typeof updateAiAgentRequestSchema>;
export type ToggleAiAgentActiveRequest = z.infer<
	typeof toggleAiAgentActiveRequestSchema
>;
export type GetAiAgentRequest = z.infer<typeof getAiAgentRequestSchema>;
