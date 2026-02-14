from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Union

from pypdf import PdfReader


# ----------------------------
# Core cleanup helpers
# ----------------------------

def dehyphenate_linebreaks(text: str) -> str:
    """
    Join words split across line breaks with hyphens:
      "re-\nturn" -> "return"
    Also convert single newlines to spaces while preserving paragraph breaks.
    """
    # "exam-\nples" -> "examples"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Convert single newlines to spaces, keep double-newlines as paragraph breaks
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)

    return text


def fix_common_pdf_artifacts(text: str) -> str:
    """
    Fix common extraction artifacts (NBSP, soft hyphens, ligatures, etc.).
    """
    # Soft hyphen
    text = text.replace("\u00ad", "")

    # Non-breaking spaces (very common in PDFs): "\u00a0"
    text = text.replace("\u00a0", " ")

    # Common ligatures that appear in PDFs
    text = (text
            .replace("\ufb01", "fi")
            .replace("\ufb02", "fl")
            .replace("\ufb00", "ff")
            .replace("\ufb03", "ffi")
            .replace("\ufb04", "ffl"))

    return text


def fix_split_words(text: str) -> str:
    """
    Fix words that have been incorrectly split by the PDF extractor.
    Keep this list tight and high-confidence.
    """
    fixes = [
        # Names / proper nouns
        (r"\bInstruct or\b", "Instructor"),
        (r"\bTenz in\b", "Tenzin"),
        (r"\bHoriz on\b", "Horizon"),

        # Common syllabus splits
        (r"\bcred its\b", "credits"),

        # Ordinals
        (r"\b1 st\b", "1st"),
        (r"\b2 nd\b", "2nd"),
        (r"\b3 rd\b", "3rd"),
        (r"\b(\d+) th\b", r"\1th"),
    ]
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text)
    return text


def fix_ordinals_domains_times(text: str) -> str:
    """
    Fix ordinals, domain splits, and time formats.
    """
    # Ordinals: "1 st" -> "1st"
    text = re.sub(r"\b(\d+)\s+(st|nd|rd|th)\b", r"\1\2", text, flags=re.IGNORECASE)

    # Domains: "gmu. edu" -> "gmu.edu" (works after NBSP normalization)
    text = re.sub(
        r"\b([A-Za-z0-9-]+)\.\s+(edu|com|org|net|gov)\b",
        r"\1.\2",
        text,
        flags=re.IGNORECASE,
    )

    # Time ranges: "2:30 -3:30" -> "2:30 - 3:30"
    text = re.sub(r"(\d+:\d+)\s*-\s*(\d+:\d+)", r"\1 - \2", text)

    return text


def fix_specific_spacing(text: str) -> str:
    """
    Fix spacing around punctuation and common stuck-together patterns.
    """
    # Space after AM/PM if stuck to a word: "PMRoom" -> "PM Room"
    text = re.sub(r"\b(AM|PM)([A-Za-z])", r"\1 \2", text)

    # "chapter1" -> "chapter 1"
    text = re.sub(r"\b(chapter)(\d+)\b", r"\1 \2", text, flags=re.IGNORECASE)

    # Space after punctuation when missing (includes comma)
    text = re.sub(r"([,.;:!?])([A-Za-z0-9])", r"\1 \2", text)

    # Normalize ampersand spacing
    text = re.sub(r"\s*&\s*", " & ", text)

    return text


def separate_glued_words_safe(text: str) -> str:
    """
    Safe glued-word splitting:
      - CamelCase
      - letter<->digit boundaries
      - a curated list of observed concatenations (high-confidence)
    """
    # CamelCase: "OfficeHours" -> "Office Hours"
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

    # letter<->digit: "Room101" -> "Room 101"
    text = re.sub(r"([A-Za-z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([A-Za-z])", r"\1 \2", text)

    # High-confidence concatenations from your syllabus output
    specific = [
        (r"\bThetextbookis\b", "The textbook is"),
        (r"\bYouwillalsoneedastudent\b", "You will also need a student"),
        (r"\binthetextbookwillbecovered\b", "in the textbook will be covered"),
        (r"\bThepaceofthecourseisveryfast\b", "The pace of the course is very fast"),
        (
            r"\bthesuccessfulcompletionofthiscoursewillrequireaserioustimecommitment\b",
            "the successful completion of this course will require a serious time commitment",
        ),
        (r"\bTherewillbequizzesevery\b", "There will be quizzes every"),
        (r"\bTherewillbetest\b", "There will be test"),
        (r"\bThursdaysat\b", "Thursdays at"),
        (r"\bendoftheclass\b", "end of the class"),
        (r"\bThequizzes\b", "The quizzes"),
        (r"\binthem?bookstore\b", "in the bookstore"),
        (r"\binthem?textbook\b", "in the textbook"),
        (r"\bnomake-?upexams?\b", "no make-up exams"),
        (r"\bmake-?upexamsorquizzes\b", "make-up exams or quizzes"),
        (r"\bnoake-?upexamsorquizzes\b", "no make-up exams or quizzes"),

        # Specific word-joins seen in output
        (r"\bMillerand\b", "Miller and"),
        (r"\bGerkenand\b", "Gerken and"),

        # Edition formatting
        (r"\b1\s*stedition\b", "1st edition"),
    ]

    for pat, rep in specific:
        text = re.sub(pat, rep, text, flags=re.IGNORECASE)

    return text


def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace without destroying paragraph boundaries.
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Collapse runs of spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Collapse 3+ newlines to 2 (keep paragraphs)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Trim whitespace at line edges
    text = "\n".join(line.strip() for line in text.split("\n"))

    return text.strip()


def normalize_pdf_text(text: str) -> str:
    """
    Processing order:
      1) Fix artifacts (NBSP, ligatures, soft hyphens)
      2) Dehyphenate & convert single newlines to spaces
      3) Fix known split words
      4) Safe glue splitting
      5) Fix ordinals/domains/times
      6) Fix punctuation spacing
      7) Final whitespace normalization
    """
    text = fix_common_pdf_artifacts(text)
    text = dehyphenate_linebreaks(text)

    text = fix_split_words(text)
    text = separate_glued_words_safe(text)

    text = fix_ordinals_domains_times(text)
    text = fix_specific_spacing(text)

    text = normalize_whitespace(text)
    return text


# ----------------------------
# Extraction
# ----------------------------

@dataclass(frozen=True)
class PageText:
    page_num: int  # 1-indexed
    text: str


def extract_pdf_pages(pdf_path: Union[str, Path]) -> List[PageText]:
    """
    Extract text from each page of a PDF file (using the provided pdf_path).
    """
    path = Path(pdf_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    reader = PdfReader(str(path))
    pages: List[PageText] = []

    for i, page in enumerate(reader.pages):
        page_num = i + 1
        raw = page.extract_text() or ""
        cleaned = normalize_pdf_text(raw)
        pages.append(PageText(page_num=page_num, text=cleaned))

    return pages


def build_marked_text(pages: List[PageText]) -> str:
    out: List[str] = []
    for p in pages:
        out.append(f"\n\n[PAGE {p.page_num}]\n")
        out.append(p.text.strip() if p.text else "")
    return "".join(out).strip()


def extract_pdf_text_with_markers(pdf_path: Union[str, Path]) -> str:
    pages = extract_pdf_pages(pdf_path)
    return build_marked_text(pages)


if __name__ == "__main__":
    # Quick local test
    test_path = "/home/sulaiman/studyforge/AI-agents/data/uploads/syllabus.pdf"
    pages = extract_pdf_pages(test_path)
    print(pages[0].text[:1500])
