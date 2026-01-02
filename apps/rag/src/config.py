from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # OpenRouter API configuration
    openrouter_api_key: str = ""
    openrouter_embedding_model: str = "openai/text-embedding-3-small"

    # Server configuration
    port: int = 8000
    host: str = "0.0.0.0"

    # Chunking defaults
    default_chunk_size: int = 512
    default_chunk_overlap: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

