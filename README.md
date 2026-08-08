# OmniParse IDP — Universal Document Analysis & Multilingual OCR Platform

OmniParse is an Intelligent Document Processing (IDP) platform powered by **PaddleOCR v3.7**, **PyMuPDF**, **Office COM Rendering**, and **Deep Translator**.

---

## ⚡ Quick 1-Line Terminal Installation (Beta)

Anyone can install `omniparse` directly in their terminal with a single command:

### Option 1: Via Pip (Cross-platform)
```bash
pip install git+https://github.com/ManvithReddyyy/OmniParse.git
```

### Option 2: Windows PowerShell
```powershell
iwr -useb https://raw.githubusercontent.com/ManvithReddyyy/OmniParse/main/install.ps1 | iex
```

### Option 3: Linux / macOS Terminal
```bash
curl -fsSL https://raw.githubusercontent.com/ManvithReddyyy/OmniParse/main/install.sh | sh
```

---

## 💻 Terminal Commands (Tesseract-compatible interface)

Once installed, run `omniparse` from any folder or terminal:

```bash
# 1. Output OCR text directly to terminal (stdout)
omniparse input.png stdout -l eng

# 2. Extract OCR from PDF/PPTX/DOCX into a text file
omniparse presentation.pptx output.txt -l japan

# 3. Extract text in Japanese and translate automatically to English
omniparse document.pdf output.md -l japan --translate en --format markdown

# 4. Extract OCR text and save as structured JSON
omniparse invoice.png output.json -f json -l german

# 5. List all supported OCR & Translation languages
omniparse --list-langs
```

---

## 🌐 Supported Languages
- **English** (`eng` / `en`)
- **Japanese** (`jpn` / `japan`)
- **German** (`ger` / `german`)
- **French** (`fre` / `french`)
- **Spanish** (`spa` / `es`)
- **Chinese** (`chi` / `ch`)
- **Hindi** (`hin` / `hi`)

---

## 🚀 Running Local Web Application
```bash
# Backend (FastAPI + PaddleOCR + Translation)
python -m uvicorn app:app --host 0.0.0.0 --port 7860

# Frontend (Vite + React)
npm run dev
```
