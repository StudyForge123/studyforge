"""Reindex a class: aggregate all PDF texts, chunk, embed, save to Mongo + FAISS."""
from __future__ import annotations

from pathlib import Path
from typing import List, Dict, Any

from app.storage.mongo import list_files, insert_chunks, get_db
from app.ingest.chunking import chunk_text
from app.ingest.embedding import build_faiss_index


async def reindex_class(class_id: str) -> int:
    """
    Load all syllabus + material + assessment extracted texts for the class,
    chunk, embed, write chunks to Mongo and FAISS index to disk.
    Returns number of chunks indexed.
    """
    files = await list_files(class_id)  # all types
    if not files:
        return 0

    all_chunks: List[Dict[str, Any]] = []
    for f in files:
        text_path = f.get("extracted_text_path")
        file_id = f.get("id", "")
        if not text_path or not Path(text_path).exists():
            continue
        try:
            marked = Path(text_path).read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        prefix = f"f_{file_id[:8] if file_id else 'x'}"
        chunks = chunk_text(marked, chunk_prefix=prefix)
        for c in chunks:
            all_chunks.append({
                "chunk_id": c.chunk_id,
                "text": c.text,
                "page_start": c.page_start,
                "page_end": c.page_end,
                "file_id": file_id,
            })

    await insert_chunks(class_id, all_chunks)
    build_faiss_index(class_id, all_chunks)
    return len(all_chunks)
