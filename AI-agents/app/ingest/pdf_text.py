from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from pypdf import PdfReader


@dataclass(frozen=True)
class PageText:
    page_num: int          # 1-indexed
    text: str              # extracted text for that page (may be empty)


def extract_pdf_pages(pdf_path: str | Path) -> List[PageText]:
    """
    Extract raw text per page using pypdf.
    Returns a list of PageText with 1-indexed page numbers.
    """
    path = Path('/home/sulaiman/studyforge/AI-agents/data/uploads/syllabus.pdf')
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    reader = PdfReader(str(path))
    pages: List[PageText] = []

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        raw = page.extract_text() or ""
        # Normalize line endings
        raw = raw.replace("\r\n", "\n").replace("\r", "\n")
        pages.append(PageText(page_num=page_num, text=raw))

    return pages


def build_marked_text(pages: List[PageText]) -> str:
    """
    Combine pages into one string with explicit page markers.
    Markers are stable and used later for page hinting/citations.
    """
    out: List[str] = []
    for p in pages:
        out.append(f"\n\n[PAGE {p.page_num}]\n")
        # Ensure separation
        text = p.text.strip()
        out.append(text if text else "")
    return "".join(out).strip()


def extract_pdf_text_with_markers(pdf_path: str | Path) -> str:
    """
    Convenience wrapper: PDF -> page list -> combined string with markers.
    """
    pages = extract_pdf_pages(pdf_path)
    return build_marked_text(pages)
