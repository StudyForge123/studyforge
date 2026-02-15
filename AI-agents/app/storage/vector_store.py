from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

try:
    import faiss
except ImportError:
    raise ImportError("Please install faiss-cpu: pip install faiss-cpu")

from app.ingest.chunking import Chunk
from app.ingest.embeddings import embed_texts, embed_single


class VectorStore:
    """
    Local FAISS vector store per class.
    Stores chunks with embeddings and metadata.
    """
    
    def __init__(self, class_id: str, base_dir: str = "data/vector_store"):
        self.class_id = class_id
        self.base_path = Path(base_dir) / class_id
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        self.index_path = self.base_path / "index.faiss"
        self.metadata_path = self.base_path / "metadata.json"
        
        self.index: Optional[faiss.IndexFlatL2] = None
        self.chunks_metadata: List[Dict[str, Any]] = []
        self.dimension = 3072  # text-embedding-3-large dimension
        
    def load(self) -> bool:
        """Load existing index and metadata. Returns True if loaded."""
        if self.index_path.exists() and self.metadata_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.chunks_metadata = json.load(f)
            return True
        return False
    
    def save(self):
        """Save index and metadata to disk."""
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path))
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks_metadata, f, indent=2)
    
    def index_chunks(self, chunks: List[Chunk], file_id: str, filename: str):
        """
        Add chunks to the index.
        chunks: List of Chunk objects from chunking.py
        file_id: MongoDB file ID for tracking
        filename: Original filename for reference
        """
        if not chunks:
            return
        
        # Extract texts and embed
        texts = [c.text for c in chunks]
        embeddings = embed_texts(texts)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Initialize index if needed
        if self.index is None:
            self.index = faiss.IndexFlatL2(self.dimension)
        
        # Add vectors to index
        start_idx = self.index.ntotal
        self.index.add(vectors)
        
        # Store metadata
        for i, chunk in enumerate(chunks):
            self.chunks_metadata.append({
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "page_start": chunk.page_start,
                "page_end": chunk.page_end,
                "file_id": file_id,
                "filename": filename,
                "index_position": start_idx + i
            })
        
        # Save to disk
        self.save()
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for most relevant chunks.
        Returns list of chunk metadata with scores.
        """
        if self.index is None or self.index.ntotal == 0:
            return []
        
        # Embed query
        query_vec = np.array([embed_single(query)], dtype=np.float32)
        
        # Search
        k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(query_vec, k)
        
        # Gather results
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(self.chunks_metadata):
                result = self.chunks_metadata[idx].copy()
                result["score"] = float(dist)  # L2 distance (lower is better)
                results.append(result)
        
        return results
    
    def clear(self):
        """Clear all data from this vector store."""
        self.index = None
        self.chunks_metadata = []
        if self.index_path.exists():
            self.index_path.unlink()
        if self.metadata_path.exists():
            self.metadata_path.unlink()


def get_vector_store(class_id: str) -> VectorStore:
    """Get or create a vector store for a class."""
    vs = VectorStore(class_id)
    vs.load()
    return vs
