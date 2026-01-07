from fastapi import APIRouter

from .chunk import router as chunk_router
from .health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(chunk_router, tags=["chunk"])



