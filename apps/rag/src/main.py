from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import api_router
from .config import settings

app = FastAPI(
    title="Cossistant RAG Service",
    description="Document chunking and embedding service for Cossistant",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "cossistant-rag",
        "version": "0.1.0",
        "status": "running",
        "embedding_model": settings.openrouter_embedding_model,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )

