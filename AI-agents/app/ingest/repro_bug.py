from app.ingest.pdf_text import normalize_pdf_text

test_cases = [
    "George Mason University",
    "Instructor", 
    "Section",
    "Horizon",
    "Textbook",
    "st edition",
    "Youwillalsoneed",
    "inthetextbookwill"
]

print("--- Testing PDF Text Normalization ---")
for text in test_cases:
    normalized = normalize_pdf_text(text)
    print(f"Original: '{text}' -> Normalized: '{normalized}'")
