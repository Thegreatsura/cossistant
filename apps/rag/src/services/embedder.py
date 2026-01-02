import httpx

from ..config import settings

OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings"


async def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding for a single text using OpenRouter API.

    Args:
        text: The text to embed

    Returns:
        A 1536-dimensional embedding vector
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openrouter_embedding_model,
                "input": text,
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter embedding failed: {response.text}")

        data = response.json()
        return data["data"][0]["embedding"]


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts using OpenRouter API.

    Args:
        texts: List of texts to embed

    Returns:
        List of 1536-dimensional embedding vectors
    """
    if not texts:
        return []

    async with httpx.AsyncClient() as client:
        response = await client.post(
            OPENROUTER_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openrouter_embedding_model,
                "input": texts,
            },
            timeout=60.0,
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter embedding failed: {response.text}")

        data = response.json()
        return [item["embedding"] for item in data["data"]]

