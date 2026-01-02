from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document

from ..config import settings


def chunk_document(
    content: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """
    Split a document into chunks using LlamaIndex's SentenceSplitter.

    Args:
        content: The document content to split
        chunk_size: Maximum size of each chunk (default from settings)
        chunk_overlap: Overlap between consecutive chunks (default from settings)

    Returns:
        List of chunk dictionaries with content and chunk_index
    """
    chunk_size = chunk_size or settings.default_chunk_size
    chunk_overlap = chunk_overlap or settings.default_chunk_overlap

    # Create a LlamaIndex document
    document = Document(text=content)

    # Use SentenceSplitter for intelligent chunking
    splitter = SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    # Split the document into nodes
    nodes = splitter.get_nodes_from_documents([document])

    # Convert nodes to chunk dictionaries
    chunks = []
    for idx, node in enumerate(nodes):
        chunks.append({
            "content": node.get_content(),
            "chunk_index": idx,
        })

    return chunks

