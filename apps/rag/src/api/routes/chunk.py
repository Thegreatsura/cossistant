from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...services.chunker import chunk_document
from ...services.embedder import generate_embeddings

router = APIRouter()


class ChunkRequest(BaseModel):
    """Request body for the chunk endpoint."""

    content: str
    metadata: dict | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None


class ChunkResponse(BaseModel):
    """A single chunk with its embedding."""

    content: str
    embedding: list[float]
    chunk_index: int
    metadata: dict | None = None


class ChunkResult(BaseModel):
    """Response body for the chunk endpoint."""

    chunks: list[ChunkResponse]
    total_chunks: int


@router.post("/chunk", response_model=ChunkResult)
async def create_chunks(request: ChunkRequest):
    """
    Split content into chunks and generate embeddings for each chunk.

    This endpoint:
    1. Splits the input content into smaller chunks using LlamaIndex
    2. Generates embeddings for each chunk using OpenRouter (OpenAI model)
    3. Returns the chunks with their embeddings
    """
    try:
        # Split the content into chunks
        chunks = chunk_document(
            content=request.content,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
        )

        if not chunks:
            return ChunkResult(chunks=[], total_chunks=0)

        # Extract content from chunks for embedding
        chunk_contents = [chunk["content"] for chunk in chunks]

        # Generate embeddings for all chunks
        embeddings = await generate_embeddings(chunk_contents)

        # Combine chunks with their embeddings
        result_chunks = []
        for chunk, embedding in zip(chunks, embeddings):
            result_chunks.append(
                ChunkResponse(
                    content=chunk["content"],
                    embedding=embedding,
                    chunk_index=chunk["chunk_index"],
                    metadata=request.metadata,
                )
            )

        return ChunkResult(chunks=result_chunks, total_chunks=len(result_chunks))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

