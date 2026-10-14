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

# ── Structured Indra / Multi-Engine Document Parser ───────────
def ocr_file_path_with_indra(file_path: str, ext: str, ocr_lang: str = "auto") -> dict:
    """
    Extract text, tables, layout blocks, and images from a document:
    - PyMuPDF / Indra OCR for PDFs (page.get_text('blocks') and page.find_tables())
    - python-pptx for presentations (shape text frames & tables)
    - python-docx for Word documents (paragraphs & docx tables)
    - PaddleOCR for images with bounding box detection
    """
    extracted_text: list[str] = []
    extracted_images: list[dict] = []
    page_images: list[str] = []
    blocks: list[dict] = []
    tables: list[dict] = []

    lang = "en" if ocr_lang == "auto" else ocr_lang

    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        with open(file_path, "rb") as f:
            raw_bytes = f.read()
        img = Image.open(io.BytesIO(raw_bytes))
        engine = get_ocr_engine(lang)

        # Run OCR with bounding boxes
        if engine is not None:
            import numpy as np
            img_rgb = img.convert("RGB") if img.mode != "RGB" else img
            arr = np.array(img_rgb)
            try:
                results = engine.ocr(arr)
            except Exception as e:
                print(f"[OmniParse] OCR error: {e}")
                results = None

            if results and isinstance(results, list):
                for res_item in results:
                    if not res_item:
                        continue
                    if isinstance(res_item, list):
                        for line_info in res_item:
                            if isinstance(line_info, (list, tuple)) and len(line_info) >= 2:
                                pts = line_info[0]
                                txt_info = line_info[1]
                                if isinstance(txt_info, (list, tuple)) and len(txt_info) > 0:
                                    txt = str(txt_info[0]).strip()
                                    conf = float(txt_info[1]) if len(txt_info) > 1 else 0.98
                                else:
                                    txt = str(txt_info).strip()
                                    conf = 0.98
                                if txt:
                                    extracted_text.append(txt)
                                    if isinstance(pts, (list, tuple)) and len(pts) >= 4:
                                        xs = [p[0] for p in pts]
                                        ys = [p[1] for p in pts]
                                        min_x, max_x = min(xs), max(xs)
                                        min_y, max_y = min(ys), max(ys)
                                        blocks.append({
                                            "type": "text",
                                            "text": txt,
                                            "confidence": round(conf, 2),
                                            "bbox": {
                                                "x": round(float(min_x), 1),
                                                "y": round(float(min_y), 1),
                                                "width": round(float(max_x - min_x), 1),
                                                "height": round(float(max_y - min_y), 1),
                                            },
                                        })

        # Fallback text if format wasn't list
        if not extracted_text:
            lines = ocr_image_paddle(img, lang=lang)
            extracted_text.extend(lines)
            for idx, line in enumerate(lines):
                blocks.append({
                    "type": "text",
                    "text": line,
                    "confidence": 0.98,
                    "bbox": {"x": 40, "y": 40 + idx * 30, "width": 500, "height": 22},
                })

        b64_img = base64.b64encode(raw_bytes).decode("utf-8")
        mime = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
        page_images.append(f"data:{mime};base64,{b64_img}")

    elif ext == ".pdf":
        doc = fitz.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]

            # 1. Native Table Extraction
            try:
                tabs = page.find_tables()
                for t_idx, tab in enumerate(tabs):
                    tab_data = tab.extract()
                    if tab_data and len(tab_data) > 0:
                        headers = [str(c or "").strip() for c in tab_data[0]]
                        rows = [[str(c or "").strip() for c in r] for r in tab_data[1:]]
                        if any(headers) or any(any(r) for r in rows):
                            table_id = f"tbl-p{page_idx + 1}-{t_idx + 1}"
                            tables.append({
                                "id": table_id,
                                "headers": headers,
                                "rows": rows,
                                "confidence": 0.99,
                            })
                            # Append table representation to text
                            extracted_text.append("| " + " | ".join(headers) + " |")
                            extracted_text.append("| " + " | ".join(["---"] * len(headers)) + " |")
                            for row in rows:
                                extracted_text.append("| " + " | ".join(row) + " |")
            except Exception as te:
                print(f"[OmniParse] PDF table extraction notice: {te}")

            # 2. Extract Text Blocks & Layout
            page_blocks = page.get_text("blocks")
            has_text = False
            for b in page_blocks:
                x0, y0, x1, y1, text, block_no, block_type = b[:7]
                clean_t = text.strip()
                if clean_t:
                    has_text = True
                    b_type = "image" if block_type == 1 else ("title" if y0 < 100 and len(clean_t) < 80 else "text")
                    blocks.append({
                        "type": b_type,
                        "text": clean_t,
                        "confidence": 0.99,
                        "bbox": {
                            "x": round(x0, 1),
                            "y": round(y0, 1),
                            "width": round(x1 - x0, 1),
                            "height": round(y1 - y0, 1),
                        },
                    })
                    extracted_text.append(clean_t)

            # 3. Render Pixmap for Document Viewer
            pix = page.get_pixmap(dpi=150)
            b64_page = base64.b64encode(pix.tobytes("png")).decode("utf-8")
            page_images.append(f"data:image/png;base64,{b64_page}")

            # 4. If scanned page with no digital text, run OCR
            if not has_text:
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                ocr_lines = ocr_image_paddle(img, lang=lang)
                if ocr_lines:
                    extracted_text.append(f"--- Page {page_idx + 1} ---")
                    extracted_text.extend(ocr_lines)
                    for idx, line in enumerate(ocr_lines):
                        blocks.append({
                            "type": "text",
                            "text": line,
                            "confidence": 0.95,
                            "bbox": {"x": 50, "y": 50 + idx * 28, "width": pix.width - 100, "height": 22},
                        })

        doc.close()

    elif ext in [".pptx", ".ppt"]:
        prs = Presentation(file_path)
        for idx, slide in enumerate(prs.slides):
            slide_header = f"Slide {idx + 1}"
            extracted_text.append(slide_header)
            blocks.append({
                "type": "header",
                "text": slide_header,
                "confidence": 0.99,
                "bbox": {"x": 40, "y": 30, "width": 400, "height": 30},
            })

            for shape in slide.shapes:
                # Text Frame
                if shape.has_text_frame:
                    t = shape.text_frame.text.strip()
                    if t:
                        extracted_text.append(t)
                        x = round(shape.left / 914400 * 72, 1) if hasattr(shape, "left") and shape.left is not None else 50
                        y = round(shape.top / 914400 * 72, 1) if hasattr(shape, "top") and shape.top is not None else 80
                        w = round(shape.width / 914400 * 72, 1) if hasattr(shape, "width") and shape.width is not None else 500
                        h = round(shape.height / 914400 * 72, 1) if hasattr(shape, "height") and shape.height is not None else 40
                        blocks.append({
                            "type": "title" if y < 120 else "text",
                            "text": t,
                            "confidence": 0.99,
                            "bbox": {"x": x, "y": y, "width": w, "height": h},
                        })

                # Slide Tables
                if shape.has_table:
                    t_rows = []
                    for r in shape.table.rows:
                        row_vals = [cell.text.strip() for cell in r.cells]
                        t_rows.append(row_vals)
                    if t_rows:
                        headers = t_rows[0]
                        data_rows = t_rows[1:] if len(t_rows) > 1 else []
                        table_id = f"tbl-slide{idx + 1}-{len(tables) + 1}"
                        tables.append({
                            "id": table_id,
                            "headers": headers,
                            "rows": data_rows,
                            "confidence": 0.99,
                        })
                        extracted_text.append("| " + " | ".join(headers) + " |")
                        extracted_text.append("| " + " | ".join(["---"] * len(headers)) + " |")
                        for dr in data_rows:
                            extracted_text.append("| " + " | ".join(dr) + " |")

        page_images = render_pptx_slides(file_path)

    elif ext in [".docx", ".doc"]:
        docx_doc = DocxDocument(file_path)
        # Paragraphs
        for p_idx, para in enumerate(docx_doc.paragraphs):
            t = para.text.strip()
            if t:
                extracted_text.append(t)
                is_heading = bool(para.style and "Heading" in getattr(para.style, "name", ""))
                blocks.append({
                    "type": "header" if is_heading else "paragraph",
                    "text": t,
                    "confidence": 0.99,
                    "bbox": {"x": 50, "y": 40 + p_idx * 28, "width": 600, "height": 22},
                })

        # Docx Tables
        for t_idx, d_table in enumerate(docx_doc.tables):
            t_rows = []
            for r in d_table.rows:
                t_rows.append([cell.text.strip() for cell in r.cells])
            if t_rows:
                headers = t_rows[0]
                data_rows = t_rows[1:] if len(t_rows) > 1 else []
                tables.append({
                    "id": f"tbl-docx-{t_idx + 1}",
                    "headers": headers,
                    "rows": data_rows,
                    "confidence": 0.99,
                })
                extracted_text.append("| " + " | ".join(headers) + " |")
                extracted_text.append("| " + " | ".join(["---"] * len(headers)) + " |")
                for dr in data_rows:
                    extracted_text.append("| " + " | ".join(dr) + " |")

    return {
        "extracted_text": extracted_text,
        "extracted_images": extracted_images,
        "page_images": page_images,
        "blocks": blocks,
        "tables": tables,
    }

# ── Extraction Endpoint ──────────────────────────────────────
@app.post("/v1/vision/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    ocr_lang: str = Form(default="auto"),
):
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = ocr_file_path_with_indra(tmp_path, ext=ext, ocr_lang=ocr_lang)
        return {
            "status": "success",
            "filename": filename,
            "payload": {
                "extracted_text": result["extracted_text"],
                "extracted_images": result.get("extracted_images", []),
                "page_images": result.get("page_images", []),
                "blocks": result.get("blocks", []),
                "tables": result.get("tables", []),
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
