from __future__ import annotations

import pickle
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import faiss

from app.ingest.chunking import Chunk


class VectorStore:
    """
    Per-class FAISS vector store for local MVP.
    Stores embeddings and metadata for efficient retrieval.
    """

    def __init__(self, class_id: str, storage_dir: Path = Path("data/vector_stores")):
        self.class_id = class_id
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.index_path = self.storage_dir / f"{class_id}_index.faiss"
        self.meta_path = self.storage_dir / f"{class_id}_meta.pkl"
        
        self.index: Optional[faiss.IndexFlatL2] = None
        self.metadata: List[Dict[str, Any]] = []
        self.dimension: Optional[int] = None
        
    def _init_index(self, dimension: int):
        """Initialize a new FAISS index."""
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        
    def save(self):
        """Save index and metadata to disk."""
        if self.index is not None and self.index.ntotal > 0:
            faiss.write_index(self.index, str(self.index_path))
            
        with open(self.meta_path, "wb") as f:
            pickle.dump({
                "metadata": self.metadata,
                "dimension": self.dimension
            }, f)
            
    def load(self) -> bool:
        """Load index and metadata from disk. Returns True if successful."""
        if not self.index_path.exists() or not self.meta_path.exists():
            return False
            
        try:
            self.index = faiss.read_index(str(self.index_path))
            
            with open(self.meta_path, "rb") as f:
                data = pickle.load(f)
                self.metadata = data["metadata"]
                self.dimension = data["dimension"]
            return True
        except Exception:
            return False
            
    def add_chunks(
        self,
        chunks: List[Chunk],
        embeddings: np.ndarray,
        file_id: str,
        file_type: str,
        filename: str
    ):
        """
        Add chunks with their embeddings to the index.
        
        Args:
            chunks: List of Chunk objects
            embeddings: numpy array of shape (N, dimension)
            file_id: MongoDB file document ID
            file_type: syllabus | material | assessment
            filename: original filename
        """
        if len(chunks) != len(embeddings):
            raise ValueError("Number of chunks must match number of embeddings")
            
        if len(chunks) == 0:
            return
            
        # Initialize index if needed
        if self.index is None:
            self._init_index(embeddings.shape[1])
            
        # Ensure embeddings are float32 and contiguous
        embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
        
        # Add to FAISS index
        self.index.add(embeddings)
        
        # Store metadata for each chunk
        for chunk in chunks:
            self.metadata.append({
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "page_start": chunk.page_start,
                "page_end": chunk.page_end,
                "file_id": file_id,
                "file_type": file_type,
                "filename": filename,
            })
            
        # Save to disk
        self.save()
        
    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        file_type_filter: Optional[str] = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Search for similar chunks.
        
        Args:
            query_embedding: numpy array of shape (dimension,)
            top_k: number of results to return
            file_type_filter: optional filter by file_type (syllabus, material, assessment)
            
        Returns:
            List of (metadata_dict, distance) tuples
        """
        if self.index is None or self.index.ntotal == 0:
            return []
            
        # Ensure query is 2D float32 and contiguous
        query_embedding = np.ascontiguousarray(
            query_embedding.reshape(1, -1), dtype=np.float32
        )
        
        # Search FAISS index (get more than needed for filtering)
        search_k = min(top_k * 3 if file_type_filter else top_k, self.index.ntotal)
        distances, indices = self.index.search(query_embedding, search_k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
                
            meta = self.metadata[idx]
            
            # Apply filter if specified
            if file_type_filter and meta.get("file_type") != file_type_filter:
                continue
                
            results.append((meta, float(dist)))
            
            if len(results) >= top_k:
                break
                
        return results
        
    def clear(self):
        """Clear the index and metadata."""
        self.index = None
        self.metadata = []
        self.dimension = None
        
        # Remove files
        if self.index_path.exists():
            self.index_path.unlink()
        if self.meta_path.exists():
            self.meta_path.unlink()
            
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        total = self.index.ntotal if self.index else 0
        
        file_types = {}
        for meta in self.metadata:
            ft = meta.get("file_type", "unknown")
            file_types[ft] = file_types.get(ft, 0) + 1
            
        return {
            "class_id": self.class_id,
            "total_chunks": total,
            "dimension": self.dimension,
            "chunks_by_type": file_types,
        }
