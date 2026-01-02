from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint for Railway and load balancers."""
    return {"status": "healthy", "service": "rag"}

