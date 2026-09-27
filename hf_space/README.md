---
title: OmniParse OCR Engine
emoji: 👁️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# OmniParse OCR API Backend

Universal document text extraction, layout analysis, and multilingual OCR powered by **PaddleOCR** and **Deep Translator**.

### Endpoints
- `GET /health` — Health check
- `POST /v1/vision/analyze` — Document & image OCR extraction (PDF, DOCX, PPTX, Images)
- `POST /api/v1/translate` — Text translation
