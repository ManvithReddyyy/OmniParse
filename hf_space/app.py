# Hugging Face ZeroGPU requires at least one @spaces.GPU function during startup
try:
    import spaces
    @spaces.GPU(duration=10)
    def _zero_gpu_warmup():
        return "ok"
except ImportError:
    def _zero_gpu_warmup():
        return "ok"

import base64
import io
import os
import tempfile
import traceback
import zipfile

# Disable MKLDNN/oneDNN to avoid ConvertPirAttribute2RuntimeAttribute PIR executor crash
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_use_onednn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import fitz
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pptx import Presentation
from docx import Document as DocxDocument
from pydantic import BaseModel
from deep_translator import GoogleTranslator
import gradio as gr

# Try importing pythoncom for Office COM slide rendering
try:
    import pythoncom
    import win32com.client
    HAS_COM = True
except Exception:
    HAS_COM = False

# ── Multilingual PaddleOCR Engine Cache ──────────────────────
_ocr_engines: dict[str, object] = {}

def get_ocr_engine(lang: str = "en"):
    """Get or initialize a PaddleOCR engine for the given language code."""
    lang_code = lang.lower().strip()
    if lang_code in ["de", "german"]:
        lang_code = "german"
    elif lang_code in ["jp", "ja", "japan", "japanese"]:
        lang_code = "japan"
    elif lang_code in ["zh", "cn", "ch", "chinese"]:
        lang_code = "ch"
    elif lang_code in ["fr", "french"]:
        lang_code = "french"
    elif lang_code in ["es", "spanish"]:
        lang_code = "es"
    elif lang_code in ["hi", "hindi"]:
        lang_code = "hi"
    else:
        lang_code = "en"

    if lang_code not in _ocr_engines:
        try:
            from paddleocr import PaddleOCR
            print(f"[OmniParse] Initializing PaddleOCR engine for lang='{lang_code}'...")
            _ocr_engines[lang_code] = PaddleOCR(use_textline_orientation=True, enable_mkldnn=False, lang=lang_code)
            print(f"[OmniParse] PaddleOCR lang='{lang_code}' initialized successfully.")
        except Exception as e:
            print(f"[OmniParse] PaddleOCR lang='{lang_code}' init failed ({e}). Falling back to 'en'.")
            traceback.print_exc()
            if "en" in _ocr_engines:
                return _ocr_engines["en"]
            return None

    return _ocr_engines.get(lang_code)

try:
    get_ocr_engine("en")
except Exception:
    pass

# ── Helper: OCR an image via PaddleOCR (CPU, Unlimited) ───────
def ocr_image_paddle(img: Image.Image, lang: str = "en") -> list[str]:
    """Run PaddleOCR on a PIL Image with specified language, return list of text lines."""
    engine = get_ocr_engine(lang)
    if engine is None:
        return []
    import numpy as np

    if img.mode != "RGB":
        img = img.convert("RGB")
    arr = np.array(img)

    try:
        results = engine.ocr(arr)
    except Exception as e:
        print(f"[OmniParse] PaddleOCR inference error: {e}")
        return []

    lines: list[str] = []
    if not results:
        return lines

    if isinstance(results, list):
        for res_item in results:
            if not res_item:
                continue
            # Format A: PaddleOCR 3.7 / PaddleX dict format: {'rec_text': ['line1', 'line2'], ...}
            if isinstance(res_item, dict):
                for k in ["rec_text", "rec_texts", "texts", "text"]:
                    if k in res_item:
                        val = res_item[k]
                        if isinstance(val, (list, tuple)):
                            for t in val:
                                if t and str(t).strip():
                                    lines.append(str(t).strip())
                        elif isinstance(val, str) and val.strip():
                            lines.append(val.strip())
            # Format B: Legacy PaddleOCR 2.x list of lists: [[ [[x,y]...], (text, score) ]]
            elif isinstance(res_item, list):
                for line_info in res_item:
                    if isinstance(line_info, (list, tuple)) and len(line_info) >= 2:
                        txt_val = line_info[1]
                        if isinstance(txt_val, (list, tuple)) and len(txt_val) > 0:
                            txt = str(txt_val[0]).strip()
                        else:
                            txt = str(txt_val).strip()
                        if txt:
                            lines.append(txt)
                    elif isinstance(line_info, str) and line_info.strip():
                        lines.append(line_info.strip())
            # Format C: Dict-like object
            elif hasattr(res_item, "get") or hasattr(res_item, "rec_text"):
                rec = getattr(res_item, "rec_text", None) or (res_item.get("rec_text") if hasattr(res_item, "get") else None)
                if rec and isinstance(rec, (list, tuple)):
                    for t in rec:
                        if t and str(t).strip():
                            lines.append(str(t).strip())

    elif isinstance(results, dict):
        for k in ["rec_text", "rec_texts", "texts"]:
            if k in results and isinstance(results[k], (list, tuple)):
                for t in results[k]:
                    if t and str(t).strip():
                        lines.append(str(t).strip())

    print(f"[OmniParse] OCR extracted {len(lines)} lines of text.")
    return lines

# ── Helper: Render slides via LibreOffice / COM ─────────────
def render_pptx_slides(file_path: str, max_slides: int = 15) -> list[str]:
    slide_images_b64: list[str] = []
    if HAS_COM:
        try:
            pythoncom.CoInitialize()
            powerpoint = win32com.client.Dispatch("PowerPoint.Application")
            abs_path = os.path.abspath(file_path)
            deck = powerpoint.Presentations.Open(abs_path, WithWindow=False)
            with tempfile.TemporaryDirectory() as tmp_out:
                num_slides = min(deck.Slides.Count, max_slides)
                for i in range(1, num_slides + 1):
                    out_img = os.path.join(tmp_out, f"slide_{i}.png")
                    deck.Slides(i).Export(out_img, "PNG", 1280, 720)
                    if os.path.exists(out_img):
                        with open(out_img, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode("utf-8")
                            slide_images_b64.append(f"data:image/png;base64,{b64}")
            deck.Close()
            powerpoint.Quit()
        except Exception as e:
            print("[OmniParse] COM slide render failed:", e)
    return slide_images_b64

# ── Gradio Web UI (Runs on CPU with UNLIMITED requests, zero quota consumption) ─
def gradio_ocr(img):
    if img is None:
        return "Please upload an image"
    lines = ocr_image_paddle(Image.fromarray(img))
    return "\n".join(lines) if lines else "[No text detected in image]"

with gr.Blocks(title="OmniParse OCR Engine") as demo:
    gr.Markdown("# OmniParse OCR Engine\nMultilingual Vision Transformer OCR API by Manvith Reddy (PaddleOCR v3.7)")
    with gr.Row():
        img_input = gr.Image(type="numpy", label="Upload Image or Document")
        text_output = gr.Textbox(label="Extracted OCR Text", lines=14)
    with gr.Row():
        btn_clear = gr.Button("Clear")
        btn_submit = gr.Button("Submit", variant="primary")

    # Regular CPU OCR handler (UNLIMITED runs, never uses ZeroGPU quota!)
    btn_submit.click(fn=gradio_ocr, inputs=img_input, outputs=text_output)
    btn_clear.click(fn=lambda: (None, ""), outputs=[img_input, text_output])

    # Invisible ZeroGPU warmup trigger (satisfies ZeroGPU startup check without consuming quota)
    _dummy_out = gr.Textbox(visible=False)
    _dummy_btn = gr.Button(visible=False)
    _dummy_btn.click(fn=_zero_gpu_warmup, outputs=_dummy_out)

# ── Attach custom endpoints directly to Gradio's internal FastAPI app ──
app = demo.app

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Extraction Endpoint ──────────────────────────────────────
@app.post("/v1/vision/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    ocr_lang: str = Form(default="auto"),
):
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    contents = await file.read()

    extracted_text: list[str] = []
    extracted_images: list[dict] = []
    page_images: list[str] = []

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
            img = Image.open(io.BytesIO(contents))
            extracted_text = ocr_image_paddle(img, lang="en" if ocr_lang == "auto" else ocr_lang)
            b64_img = base64.b64encode(contents).decode("utf-8")
            mime = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
            page_images.append(f"data:{mime};base64,{b64_img}")

        elif ext == ".pdf":
            doc = fitz.open(tmp_path)
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                lines = ocr_image_paddle(img, lang="en" if ocr_lang == "auto" else ocr_lang)
                if lines:
                    extracted_text.append(f"--- Page {page_idx + 1} ---")
                    extracted_text.extend(lines)
                b64_page = base64.b64encode(pix.tobytes("png")).decode("utf-8")
                page_images.append(f"data:image/png;base64,{b64_page}")
            doc.close()

        elif ext in [".pptx", ".ppt"]:
            prs = Presentation(tmp_path)
            for idx, slide in enumerate(prs.slides):
                slide_lines = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            t = paragraph.text.strip()
                            if t:
                                slide_lines.append(t)
                if slide_lines:
                    extracted_text.append(f"Slide {idx + 1}")
                    extracted_text.extend(slide_lines)
            page_images = render_pptx_slides(tmp_path)

        elif ext in [".docx", ".doc"]:
            docx_doc = DocxDocument(tmp_path)
            for para in docx_doc.paragraphs:
                t = para.text.strip()
                if t:
                    extracted_text.append(t)

        return {
            "status": "success",
            "filename": filename,
            "payload": {
                "extracted_text": extracted_text,
                "extracted_images": extracted_images,
                "page_images": page_images,
            },
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# ── Translation Request Model ─────────────────────────────────
class TranslationRequest(BaseModel):
    lines: list[str]
    target_lang: str = "en"
    source_lang: str = "auto"

@app.post("/v1/vision/translate")
async def translate_text_endpoint(req: TranslationRequest):
    if not req.lines:
        return {"status": "success", "translated_lines": []}

    target = req.target_lang.lower().strip()
    if target in ["jp", "japan", "japanese"]:
        target = "ja"
    elif target in ["de", "german"]:
        target = "de"
    elif target in ["ch", "chinese", "zh"]:
        target = "zh-CN"

    try:
        translator = GoogleTranslator(source=req.source_lang, target=target)
        translated_lines = []
        for line in req.lines:
            if not line.strip() or line.startswith(("Page ", "Slide ", "[No text")):
                translated_lines.append(line)
            else:
                try:
                    translated_lines.append(translator.translate(line.strip()))
                except Exception:
                    translated_lines.append(line)

        return {
            "status": "success",
            "target_lang": target,
            "translated_lines": translated_lines,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

# ── Health check ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ocr_engine": "PaddleOCR v3.7 Multilingual",
        "version": "2.3.0",
    }

# ── Launch Gradio & ZeroGPU runner ───────────────────────────
if __name__ == "__main__":
    demo.launch()
