from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional, Tuple


PAGE_RE = re.compile(r"\[PAGE\s+(\d+)\]")


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    text: str
    page_start: Optional[int]
    page_end: Optional[int]


def _page_bounds(text: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Infer page bounds by scanning for [PAGE N] markers inside chunk text.
    """
    nums = [int(m.group(1)) for m in PAGE_RE.finditer(text)]
    if not nums:
        return None, None
    return min(nums), max(nums)


def _split_paragraphs(marked_text: str) -> List[str]:
    """
    Split into paragraph-like blocks while keeping page markers inside the stream.
    We keep markers as their own blocks to preserve page hinting.
    """
    # Insert hard breaks around page markers so they act as boundaries
    normalized = PAGE_RE.sub(lambda m: f"\n\n[PAGE {m.group(1)}]\n\n", marked_text)
    blocks = [b.strip() for b in normalized.split("\n\n") if b.strip()]
    return blocks


def chunk_text(
    marked_text: str,
    target_chars: int = 1100,
    overlap_chars: int = 150,
    chunk_prefix: str = "chunk",
) -> List[Chunk]:
    """
    Deterministic chunking:
    - Builds chunks from paragraph blocks
    - Aims for target_chars size
    - Adds overlap between successive chunks
    """
    if target_chars < 300:
        raise ValueError("target_chars too small")
    if overlap_chars < 0 or overlap_chars >= target_chars:
        raise ValueError("overlap_chars must be >=0 and < target_chars")

    blocks = _split_paragraphs(marked_text)

    raw_chunks: List[str] = []
    buf: List[str] = []
    buf_len = 0

    def flush():
        nonlocal buf, buf_len
        if buf:
            raw_chunks.append("\n\n".join(buf).strip())
            buf = []
            buf_len = 0

    for b in blocks:
        add_len = len(b) + (2 if buf else 0)
        if buf_len + add_len <= target_chars:
            buf.append(b)
            buf_len += add_len
        else:
            flush()
            buf.append(b)
            buf_len = len(b)

            # If a single block is huge, hard-split it
            while buf_len > target_chars:
                text = buf[0]
                raw_chunks.append(text[:target_chars].strip())
                remainder = text[target_chars - overlap_chars :].strip() if overlap_chars else text[target_chars:].strip()
                buf = [remainder] if remainder else []
                buf_len = len(remainder)

    flush()

    # Add overlap between chunks by prefixing tail of previous chunk
    final_chunks: List[Chunk] = []
    prev_tail = ""

    for i, c in enumerate(raw_chunks):
        if overlap_chars and prev_tail:
            merged = (prev_tail + "\n\n" + c).strip()
        else:
            merged = c

        # compute tail for next chunk overlap
        prev_tail = merged[-overlap_chars:] if overlap_chars else ""

        p_start, p_end = _page_bounds(merged)
        final_chunks.append(
            Chunk(
                chunk_id=f"{chunk_prefix}_{i:04d}",
                text=merged,
                page_start=p_start,
                page_end=p_end,
            )
        )

    # Drop useless tiny chunks (usually page markers only)
    final_chunks = [c for c in final_chunks if len(c.text.strip()) >= 200]

    return final_chunks
