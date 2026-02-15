"""Vector search over class FAISS index + Mongo chunks."""
from __future__ import annotations

from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np
from openai import OpenAI

from app import config

try:
    import faiss
except ImportError:
    faiss = None

client = OpenAI(api_key=config.OPENAI_API_KEY)
FAISS_DIR = config.DATA_DIR / "faiss"


def _faiss_path(class_id: str) -> tuple[Path, Path]:
    safe = class_id.replace("/", "_").replace("\\", "_")
    return FAISS_DIR / f"class_{safe}.faiss", FAISS_DIR / f"class_{safe}_meta.json"


def search_chunks(
    class_id: str,
    query: str,
    k: int = 10,
    class_chunk_map: Optional[Dict[str, Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Search FAISS index for class_id with query. Return list of
    {chunk_id, text, score, page_start, page_end, file_id} using class_chunk_map
    for text (if provided) or only chunk_ids if not.
    """
    if not faiss:
        return []
    index_path, meta_path = _faiss_path(class_id)
    if not index_path.exists() or not meta_path.exists():
        return []
    import json
    index = faiss.read_index(str(index_path))
    chunk_ids = json.loads(meta_path.read_text(encoding="utf-8"))
    if not chunk_ids:
        return []

    # Embed query and search (inner product on normalized vectors)
    resp = client.embeddings.create(model=config.OPENAI_EMBED_MODEL, input=[query])
    q = np.array([resp.data[0].embedding], dtype=np.float32)
    faiss.normalize_L2(q)
    scores, indices = index.search(q, min(k, len(chunk_ids)))
    results = []
    for i, idx in enumerate(indices[0]):
        if idx < 0 or idx >= len(chunk_ids):
            continue
        cid = chunk_ids[idx]
        score = float(scores[0][i])
        entry = {"chunk_id": cid, "score": score}
        if class_chunk_map and cid in class_chunk_map:
            entry["text"] = class_chunk_map[cid].get("text", "")
            entry["page_start"] = class_chunk_map[cid].get("page_start")
            entry["page_end"] = class_chunk_map[cid].get("page_end")
            entry["file_id"] = class_chunk_map[cid].get("file_id")
        results.append(entry)
    return results
