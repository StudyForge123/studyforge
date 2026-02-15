"""OpenAI embeddings and FAISS index build/update per class."""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Any, Dict

import numpy as np
from openai import OpenAI

from app import config

try:
    import faiss
except ImportError:
    faiss = None

client = OpenAI(api_key=config.OPENAI_API_KEY)
FAISS_DIR = config.DATA_DIR / "faiss"
FAISS_DIR.mkdir(parents=True, exist_ok=True)


def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Batch embed texts with OpenAI. Returns list of vectors."""
    if not texts:
        return []
    # API accepts batch; avoid oversized batches
    batch_size = 100
    out = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = client.embeddings.create(model=config.OPENAI_EMBED_MODEL, input=batch)
        for e in resp.data:
            out.append(e.embedding)
    return out


def _faiss_path(class_id: str) -> tuple[Path, Path]:
    safe = class_id.replace("/", "_").replace("\\", "_")
    return FAISS_DIR / f"class_{safe}.faiss", FAISS_DIR / f"class_{safe}_meta.json"


def build_faiss_index(class_id: str, chunks: List[Dict[str, Any]]) -> None:
    """
    chunks: list of {chunk_id, text, page_start, page_end, file_id}.
    Builds FAISS index and saves chunk_id order to meta file.
    """
    if not faiss:
        raise RuntimeError("faiss-cpu is not installed")
    if not chunks:
        index_path, meta_path = _faiss_path(class_id)
        if index_path.exists():
            index_path.unlink()
        if meta_path.exists():
            meta_path.unlink()
        return

    texts = [c["text"] for c in chunks]
    vectors = get_embeddings(texts)
    n = len(vectors)
    dim = len(vectors[0])
    matrix = np.array(vectors, dtype=np.float32)
    index = faiss.IndexFlatIP(dim)  # inner product for normalized vectors
    faiss.normalize_L2(matrix)
    index.add(matrix)

    index_path, meta_path = _faiss_path(class_id)
    faiss.write_index(index, str(index_path))
    meta_path.write_text(json.dumps([c["chunk_id"] for c in chunks], indent=0), encoding="utf-8")


def _load_index(class_id: str) -> tuple[Any, List[str]]:
    index_path, meta_path = _faiss_path(class_id)
    if not index_path.exists() or not meta_path.exists():
        return None, []
    index = faiss.read_index(str(index_path))
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    return index, meta
