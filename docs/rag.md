# RAG System Documentation

This document describes the Retrieval-Augmented Generation (RAG) system used in Cossistant to provide AI agents with relevant context from knowledge bases and visitor/contact memories.

## Overview

The RAG system enables AI agents to:

- Retrieve relevant knowledge from website knowledge bases (articles, FAQs, URLs)
- Access visitor preferences and conversation history (visitor memories)
- Access contact preferences and history (contact memories)

This creates a context-aware AI that can provide personalized, accurate responses based on stored knowledge and user history.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Request                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           apps/api (Hono/TRPC)                               │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  embedding-client   │  │   vector-search     │  │   chunk schema      │  │
│  │  (OpenRouter API)   │  │   (similarity)      │  │   (Drizzle ORM)     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
           │                          │                         │
           ▼                          ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│   OpenRouter API    │  │   PostgreSQL +      │  │     apps/rag           │
│   (embeddings)      │  │   pgvector          │  │   (FastAPI + LlamaIndex)│
│   text-embedding-   │  │   (vector storage)  │  │   (document chunking)  │
│   3-small (1536d)   │  │                     │  │                        │
└─────────────────────┘  └─────────────────────┘  └─────────────────────────┘
```

## Components

### 1. RAG Service (`apps/rag/`)

A Python FastAPI service that handles document chunking using LlamaIndex.

**Location**: `apps/rag/`

**Technology Stack**:

- FastAPI for HTTP API
- LlamaIndex for intelligent document splitting
- Pydantic for data validation

**Endpoints**:

| Endpoint      | Method | Description                                       |
| ------------- | ------ | ------------------------------------------------- |
| `POST /chunk` | POST   | Split content into chunks and generate embeddings |
| `GET /health` | GET    | Health check for load balancers                   |
| `GET /`       | GET    | Service info and status                           |

**POST /chunk Request**:

```json
{
  "content": "Long document text to be chunked...",
  "metadata": { "title": "Document Title", "url": "https://..." },
  "chunk_size": 512,
  "chunk_overlap": 50
}
```

**POST /chunk Response**:

```json
{
  "chunks": [
    {
      "content": "First chunk content...",
      "embedding": [0.123, -0.456, ...],
      "chunk_index": 0,
      "metadata": { "title": "Document Title" }
    }
  ],
  "total_chunks": 5
}
```

**Configuration** (environment variables):

- `OPENROUTER_API_KEY` - OpenRouter API key for embeddings
- `OPENROUTER_EMBEDDING_MODEL` - Model to use (default: `openai/text-embedding-3-small`)
- `PORT` - Server port (default: `8000`)

### 2. Chunk Schema (`apps/api/src/db/schema/chunk.ts`)

Drizzle ORM schema for storing chunks with vector embeddings in PostgreSQL.

**Table: `chunk`**

| Column         | Type         | Description                                              |
| -------------- | ------------ | -------------------------------------------------------- |
| `id`           | VARCHAR(26)  | ULID primary key                                         |
| `website_id`   | VARCHAR(26)  | **Required** - Website reference for data isolation      |
| `knowledge_id` | VARCHAR(26)  | Reference to knowledge entry (nullable)                  |
| `visitor_id`   | VARCHAR(26)  | Reference to visitor (nullable)                          |
| `contact_id`   | VARCHAR(26)  | Reference to contact (nullable)                          |
| `source_type`  | TEXT         | `'knowledge'`, `'visitor_memory'`, or `'contact_memory'` |
| `content`      | TEXT         | The chunk text content                                   |
| `embedding`    | VECTOR(1536) | OpenAI embedding vector                                  |
| `chunk_index`  | INTEGER      | Position in original document                            |
| `metadata`     | JSONB        | Additional metadata (title, URL, etc.)                   |
| `created_at`   | TIMESTAMP    | Creation timestamp                                       |
| `updated_at`   | TIMESTAMP    | Last update timestamp                                    |

**Indexes**:

- `chunk_embedding_idx` - HNSW index for fast vector similarity search
- `chunk_website_idx` - Index on website_id
- `chunk_knowledge_idx` - Index on knowledge_id
- `chunk_visitor_idx` - Index on visitor_id
- `chunk_contact_idx` - Index on contact_id
- `chunk_source_type_idx` - Index on source_type
- `chunk_website_source_type_idx` - Composite index for common queries

### 3. Embedding Client (`apps/api/src/lib/embedding-client.ts`)

TypeScript client for generating embeddings via OpenRouter API.

**Functions**:

```typescript
// Generate embedding for a single text
async function generateEmbedding(text: string): Promise<number[]>;

// Generate embeddings for multiple texts (batch)
async function generateEmbeddings(texts: string[]): Promise<number[][]>;
```

**Configuration** (in `apps/api/src/env.ts`):

- `OPENROUTER_API_KEY` - API key for OpenRouter
- `OPENROUTER_EMBEDDING_MODEL` - Model ID (default: `openai/text-embedding-3-small`)

### 4. Vector Search Utilities (`apps/api/src/utils/vector-search.ts`)

Utilities for performing vector similarity search on chunks.

**Main Function**:

```typescript
async function findSimilarChunks(
  db: Database,
  query: string,
  options: VectorSearchOptions
): Promise<ChunkSearchResult[]>;
```

**Options**:

```typescript
interface VectorSearchOptions {
  websiteId: string; // Required - for data isolation
  sourceType?: SourceType; // 'knowledge' | 'visitor_memory' | 'contact_memory'
  visitorId?: string; // Filter by visitor
  contactId?: string; // Filter by contact
  knowledgeId?: string; // Filter by knowledge entry
  minSimilarity?: number; // Minimum score (0-1, default: 0.5)
  limit?: number; // Max results (default: 10)
}
```

**Convenience Functions**:

```typescript
// Find similar knowledge chunks
async function findSimilarKnowledge(db, query, websiteId, options?);

// Find similar visitor memories
async function findSimilarVisitorMemories(
  db,
  query,
  { websiteId, visitorId, ...options }
);

// Find similar contact memories
async function findSimilarContactMemories(
  db,
  query,
  { websiteId, contactId, ...options }
);
```

## Data Flow

### Indexing Flow (when knowledge is created/updated)

```
1. Knowledge entry created/updated in apps/api
                    │
                    ▼
2. Content sent to apps/rag POST /chunk
                    │
                    ▼
3. LlamaIndex splits content into chunks
                    │
                    ▼
4. Each chunk embedded via OpenRouter API
                    │
                    ▼
5. Chunks + embeddings returned to apps/api
                    │
                    ▼
6. Chunks stored in PostgreSQL (chunk table)
```

### Query Flow (when AI agent needs context)

```
1. User message received
                    │
                    ▼
2. Query text embedded via OpenRouter API
   (apps/api/src/lib/embedding-client.ts)
                    │
                    ▼
3. Vector similarity search in PostgreSQL
   (apps/api/src/utils/vector-search.ts)
                    │
                    ▼
4. Top K similar chunks returned
                    │
                    ▼
5. Chunks provided as context to AI agent
```

## Source Types

### Knowledge (`source_type = 'knowledge'`)

- Chunks from knowledge base entries (articles, FAQs, URLs)
- Linked via `knowledge_id` foreign key
- Used to provide AI agents with website-specific knowledge

### Visitor Memory (`source_type = 'visitor_memory'`)

- Chunks from visitor conversation history and preferences
- Linked via `visitor_id` foreign key
- Used to personalize responses based on visitor history

### Contact Memory (`source_type = 'contact_memory'`)

- Chunks from identified contact history and preferences
- Linked via `contact_id` foreign key
- Visitors can be linked to contacts when identified

## Data Isolation

**Critical**: All chunks are scoped by `website_id`, which is a **required** field. This ensures:

- Complete data isolation between different websites
- No data leakage across organizations
- All queries must include `websiteId` for filtering

## Local Development

### Prerequisites

- Docker and Docker Compose
- Bun (v1.2+)
- OpenRouter API key

### Starting Services

```bash
# Start PostgreSQL (with pgvector) and Redis
docker compose up postgres redis -d

# Run database migrations
cd apps/api && bun run db:migrate

# Start RAG service (requires OPENROUTER_API_KEY)
OPENROUTER_API_KEY=sk-or-... docker compose up rag -d

# Verify RAG service is running
curl http://localhost:8082/health
# {"status":"healthy","service":"rag"}
```

### Environment Variables

Add to your `.env` file:

```bash
# OpenRouter API configuration
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small

# RAG service URL (for apps/api to call)
RAG_SERVICE_URL=http://localhost:8082
```

## Production Deployment (Railway)

### Services to Deploy

| Service     | Source               | Environment Variables                   |
| ----------- | -------------------- | --------------------------------------- |
| PostgreSQL  | PlanetScale Postgres | Enable pgvector extension               |
| RAG Service | `Dockerfile.rag`     | `OPENROUTER_API_KEY`, `PORT`            |
| API         | `Dockerfile.api`     | `OPENROUTER_API_KEY`, `RAG_SERVICE_URL` |

### Enable pgvector on PlanetScale

Run this migration on your production database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Railway Deployment Steps

1. Create a new Railway service from `Dockerfile.rag`
2. Set environment variables:
   - `OPENROUTER_API_KEY=sk-or-...`
   - `OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small`
   - `PORT=8000`
3. Deploy and note the service URL
4. Add `RAG_SERVICE_URL` to your API service environment

## Embedding Model

The system uses OpenAI's `text-embedding-3-small` model via OpenRouter:

- **Dimensions**: 1536
- **Cost**: Very low cost per token
- **Quality**: Excellent for semantic search

To use a different model, update `OPENROUTER_EMBEDDING_MODEL` and modify the vector dimensions in:

- `apps/api/src/db/schema/chunk.ts` (line with `vector("embedding", { dimensions: 1536 })`)
- Re-run migrations to update the database schema

## Performance Considerations

### HNSW Index

The chunk table uses an HNSW (Hierarchical Navigable Small World) index for vector similarity search:

- Provides approximate nearest neighbor search
- Much faster than exact search for large datasets
- Configured with `vector_cosine_ops` for cosine similarity

### Chunking Strategy

Default chunking parameters:

- `chunk_size`: 512 tokens
- `chunk_overlap`: 50 tokens

Adjust these based on your content type:

- Shorter chunks (256-512) for FAQ-style content
- Longer chunks (512-1024) for detailed documentation

### Batch Operations

When indexing many documents:

- Use `generateEmbeddings()` for batch embedding (more efficient)
- Process chunks in batches to avoid rate limits
- Consider using a job queue for large imports

## Troubleshooting

### Common Issues

**1. pgvector extension not found**

```sql
-- Run on your database
CREATE EXTENSION IF NOT EXISTS vector;
```

**2. RAG service not starting**

- Check `OPENROUTER_API_KEY` is set
- Verify Docker build completed successfully
- Check logs: `docker compose logs rag`

**3. Empty search results**

- Verify chunks exist for the website:
  ```sql
  SELECT COUNT(*) FROM chunk WHERE website_id = 'your-website-id';
  ```
- Lower `minSimilarity` threshold (default is 0.5)
- Check embedding dimensions match (1536 for text-embedding-3-small)

**4. Slow queries**

- Ensure HNSW index exists: `\d chunk` in psql
- Consider reducing `limit` parameter
- Check if `website_id` index is being used

## Future Improvements

- [ ] Add support for hybrid search (vector + keyword)
- [ ] Implement chunk caching for frequently accessed content
- [ ] Add support for document metadata filtering
- [ ] Implement automatic re-chunking when knowledge is updated
- [ ] Add support for multiple embedding models
