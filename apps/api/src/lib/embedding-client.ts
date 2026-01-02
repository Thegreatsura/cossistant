import { env } from "../env";

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
 * @returns A 1536-dimensional embedding vector (for text-embedding-3-small)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: env.OPENROUTER_EMBEDDING_MODEL,
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
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
	if (texts.length === 0) {
		return [];
	}

	const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: env.OPENROUTER_EMBEDDING_MODEL,
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
