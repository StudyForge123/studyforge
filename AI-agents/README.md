# Running the backend
- run `uvicorn app.main:app --reload --port 8001`
- check health at `http://localhost:8001/health`
- you should see `{"ok": true, "env": "dev", "model": "gpt-4.1-mini"}`

---

## Running pdf_text.py
- run `python -c "from app.ingest.pdf_text import extract_pdf_text_with_markers; print(extract_pdf_text_with_markers('data/uploads/test.pdf')[:1200])"`

