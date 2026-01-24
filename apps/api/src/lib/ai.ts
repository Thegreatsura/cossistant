/**
 * Centralized AI SDK Setup
 *
 * This module provides a unified configuration for the Vercel AI SDK with:
 * - OpenRouter as the primary provider
 * - DevTools middleware for debugging (in development)
 * - Configurable model selection and parameters
 *
 * Usage:
 *   import { createModel, createEmbeddingModel, generateText, streamText } from "@api/lib/ai";
 *
 *   // Use with AI SDK functions
 *   const result = await generateText({
 *     model: createModel("openai/gpt-4o"),
 *     prompt: "Hello!",
 *   });
 */

import { devToolsMiddleware } from "@ai-sdk/devtools";
import { env } from "@api/env";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel, wrapLanguageModel } from "ai";

// Re-export commonly used AI SDK functions for convenience
export {
	generateObject,
	generateText,
	hasToolCall,
	type ModelMessage,
	Output,
	stepCountIs,
	streamObject,
	streamText,
	type ToolSet,
} from "ai";

/**
 * Check if DevTools should be enabled
 * Only enabled in development mode
 */
const isDevToolsEnabled = env.NODE_ENV === "development";

/**
 * Default OpenRouter provider instance
 */
let openRouterInstance: ReturnType<typeof createOpenRouter> | null = null;

/**
 * Get or create the OpenRouter provider instance
 */
function getOpenRouter() {
	if (!openRouterInstance) {
		if (!env.OPENROUTER_API_KEY) {
			throw new Error(
				"OPENROUTER_API_KEY is not configured. Please set it in your environment variables."
			);
		}

		openRouterInstance = createOpenRouter({
			apiKey: env.OPENROUTER_API_KEY,
		});
	}

	return openRouterInstance;
}

/**
 * Model configuration options
 */
export type ModelOptions = {
	/**
	 * Enable DevTools middleware for this model
	 * Defaults to true in development, false in production
	 */
	devTools?: boolean;
};

/**
 * Create a language model with OpenRouter and optional DevTools integration
 *
 * @param modelId - The model ID (e.g., "openai/gpt-4o", "anthropic/claude-3-opus")
 * @param options - Optional configuration
 * @returns A language model ready for use with AI SDK functions
 *
 * @example
 * ```ts
 * import { createModel, generateText } from "@api/lib/ai";
 *
 * const result = await generateText({
 *   model: createModel("openai/gpt-4o"),
 *   prompt: "Hello!",
 * });
 * ```
 */
export function createModel(
	modelId: string,
	options: ModelOptions = {}
): LanguageModel {
	const { devTools = isDevToolsEnabled } = options;

	const openrouter = getOpenRouter();
	const baseModel = openrouter.chat(modelId);

	// Wrap with DevTools middleware in development
	if (devTools) {
		return wrapLanguageModel({
			model: baseModel,
			middleware: devToolsMiddleware(),
		});
	}

	return baseModel;
}

/**
 * Create a language model WITHOUT DevTools middleware
 * Useful for high-frequency or background operations where DevTools overhead is unwanted
 *
 * @param modelId - The model ID (e.g., "openai/gpt-4o")
 * @returns A language model without DevTools wrapping
 */
export function createModelRaw(modelId: string): LanguageModel {
	const openrouter = getOpenRouter();
	return openrouter.chat(modelId);
}

/**
 * Embedding configuration
 */
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";

type EmbeddingResponse = {
	data: Array<{
		embedding: number[];
		index: number;
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
};

/**
 * Generate an embedding for a single text using OpenRouter API.
 *
 * @param text - The text to embed
 * @param model - Optional model override (defaults to OPENROUTER_EMBEDDING_MODEL env var)
 * @returns A 1536-dimensional embedding vector (for text-embedding-3-small)
 */
export async function generateEmbedding(
	text: string,
	model?: string
): Promise<number[]> {
	if (!env.OPENROUTER_API_KEY) {
		throw new Error("OPENROUTER_API_KEY is not configured");
	}

	const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: model ?? env.OPENROUTER_EMBEDDING_MODEL,
			input: text,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`OpenRouter embedding failed: ${response.status} - ${errorText}`
		);
	}

	const data = (await response.json()) as EmbeddingResponse;
	return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts using OpenRouter API.
 * More efficient than calling generateEmbedding multiple times.
 *
 * @param texts - Array of texts to embed
 * @param model - Optional model override (defaults to OPENROUTER_EMBEDDING_MODEL env var)
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddings(
	texts: string[],
	model?: string
): Promise<number[][]> {
	if (texts.length === 0) {
		return [];
	}

	if (!env.OPENROUTER_API_KEY) {
		throw new Error("OPENROUTER_API_KEY is not configured");
	}

	const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: model ?? env.OPENROUTER_EMBEDDING_MODEL,
			input: texts,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`OpenRouter embedding failed: ${response.status} - ${errorText}`
		);
	}

	const data = (await response.json()) as EmbeddingResponse;
	// Sort by index to ensure order matches input
	return data.data
		.sort((a, b) => a.index - b.index)
		.map((item) => item.embedding);
}

/**
 * Commonly used model IDs for convenience
 */
export const Models = {
	// OpenAI models
	GPT4O: "openai/gpt-4o",
	GPT4OMini: "openai/gpt-4o-mini",
	GPT4: "openai/gpt-4",
	GPT35Turbo: "openai/gpt-3.5-turbo",

	// Anthropic models
	Claude3Opus: "anthropic/claude-3-opus",
	Claude3Sonnet: "anthropic/claude-3-sonnet",
	Claude35Sonnet: "anthropic/claude-3.5-sonnet",
	Claude3Haiku: "anthropic/claude-3-haiku",

	// Fast/cheap models for background tasks
	Fast: "openai/gpt-4o-mini",
	Cheap: "openai/gpt-4o-mini",

	// Embedding models
	TextEmbedding3Small: "openai/text-embedding-3-small",
	TextEmbedding3Large: "openai/text-embedding-3-large",
} as const;

/**
 * Default models for specific use cases
 */
export const DefaultModels = {
	/** Fast model for non-critical tasks like summaries */
	summary: Models.GPT4OMini,
	/** Model for prompt generation */
	promptGeneration: "openai/gpt-5.2",
	/** Default embedding model */
	embedding: Models.TextEmbedding3Small,
} as const;
