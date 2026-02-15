from __future__ import annotations

import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any, Optional
from openai import OpenAI
from pathlib import Path

# Use a local directory to store FAISS indices and chunk metadata
VECTOR_DB_DIR = Path("data/vector_db")
VECTOR_DB_DIR.mkdir(parents=True, exist_ok=True)

class VectorStore:
    def __init__(self, class_id: str):
        self.class_id = class_id
        self.index_path = VECTOR_DB_DIR / f"{class_id}.index"
        self.metadata_path = VECTOR_DB_DIR / f"{class_id}.json"
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
        
        self.dimension = 3072 # For text-embedding-3-large
        if "small" in self.embed_model:
            self.dimension = 1536
            
        if self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.metadata_path, "r") as f:
                self.metadata = json.load(f)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
            self.metadata = []

    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        response = self.client.embeddings.create(
            input=texts,
            model=self.embed_model
        )
        return [d.embedding for d in response.data]

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        if not chunks:
            return
            
        texts = [c["text"] for c in chunks]
        embeddings = self._get_embeddings(texts)
        
        embeddings_np = np.array(embeddings).astype("float32")
        self.index.add(embeddings_np)
        
        # Store metadata (chunk_id, text, page_start, etc.)
        for chunk in chunks:
            self.metadata.append(chunk)
            
        self._save()

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        with open(self.metadata_path, "w") as f:
            json.dump(self.metadata, f)

    def search(
        self,
        query: str,
        top_k: int = 5,
        filename: Optional[str] = None,
        file_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if self.index.ntotal == 0:
            return []
            
        query_embedding = self._get_embeddings([query])[0]
        query_np = np.array([query_embedding]).astype("float32")

        # Over-fetch when filtering by file metadata so we can still return top_k matches.
        search_k = top_k
        if filename or file_type:
            search_k = min(max(top_k * 30, top_k), self.index.ntotal)

        distances, indices = self.index.search(query_np, search_k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                item = self.metadata[idx]
                if filename and item.get("filename") != filename:
                    continue
                if file_type and item.get("file_type") != file_type:
                    continue
                results.append({
                    **item,
                    "score": float(distances[0][i])
                })
                if len(results) >= top_k:
                    break
        return results

def get_vector_store(class_id: str) -> VectorStore:
    return VectorStore(class_id)
