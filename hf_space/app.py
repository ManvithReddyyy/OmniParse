"""
OmniParse Backend — Unified document & image text/media extraction using
PaddleOCR (Multilingual: EN, DE, JP, FR, ES, CH, HI) & PyMuPDF +
Office COM slide rendering & Translation.
"""

import base64
import io
import os
import tempfile
import traceback
import zipfile
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
import fitz  # PyMuPDF

from PIL import Image

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    Form,
    HTTPException,
    Depends,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pptx import Presentation
from docx import Document as DocxDocument
from pydantic import BaseModel
from deep_translator import GoogleTranslator

# Try importing pythoncom for Office COM slide rendering
try:
    import pythoncom
    import win32com.client
    HAS_COM = True
except Exception:
    HAS_COM = False

# ── FastAPI App ──────────────────────────────────────────────
app = FastAPI(
    title="OmniParse OCR API",
    version="2.3.0",
    description="Universal document text, media & slide page image rendering backend powered by PaddleOCR & Deep Translator",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Authentication ──────────────────────────────────────────

AUTH_DB = "auth.db"

SECRET_KEY = os.getenv(
    "OMNIPARSE_SECRET_KEY",
    "omniparse-development-secret-change-this"
)

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()


def get_db():
    conn = sqlite3.connect(AUTH_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


init_auth_db()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100_000
    )

    return f"{salt.hex()}:{password_hash.hex()}"


def verify_password(
    password: str,
    stored_password: str
) -> bool:

    try:
        salt_hex, hash_hex = stored_password.split(":")

        salt = bytes.fromhex(salt_hex)

        password_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            100_000
        )

        return secrets.compare_digest(
            password_hash.hex(),
            hash_hex
        )

    except Exception:
        return False


def create_access_token(user_id: int) -> str:

    expires = (
        datetime.now(timezone.utc)
        + timedelta(days=TOKEN_EXPIRE_DAYS)
    )

    payload = {
        "sub": str(user_id),
        "exp": expires
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
# ── Signup ──────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


@app.post("/auth/signup")
async def signup(request: SignupRequest):

    name = request.name.strip()
    email = request.email.strip().lower()
    password = request.password

    # Validate name
    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    # Validate email
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )

    # Validate password
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

    # Connect to database
    conn = get_db()

    # Check whether email already exists
    existing_user = conn.execute(
        "SELECT id FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    if existing_user:
        conn.close()

        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    # Hash password
    password_hash = hash_password(password)

    # Create user
    cursor = conn.execute(
        """
        INSERT INTO users
        (name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            name,
            email,
            password_hash,
            datetime.now(timezone.utc).isoformat()
        )
    )

    conn.commit()

    user_id = cursor.lastrowid

    conn.close()

    return {
        "message": "Account created successfully",
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    }
# ── Login ───────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/login")
async def login(request: LoginRequest):

    email = request.email.strip().lower()

    conn = get_db()

    user = conn.execute(
        """
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    conn.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        request.password,
        user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user["id"])

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }
# ── Current User ────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    conn = get_db()

    user = conn.execute(
        """
        SELECT id, name, email
        FROM users
        WHERE id = ?
        """,
        (int(user_id),)
    ).fetchone()

    conn.close()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"]
    }


@app.get("/auth/me")
async def get_me(
    current_user=Depends(get_current_user)
):
    return {
        "user": current_user
    }

# ── Multilingual PaddleOCR Engine Cache ──────────────────────
_ocr_engines: dict[str, object] = {}

def get_ocr_engine(lang: str = "en"):
    """Get or initialize a PaddleOCR engine for the given language code."""
    lang_code = lang.lower().strip()
    # Normalize aliases
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
            _ocr_engines[lang_code] = PaddleOCR(use_textline_orientation=True, lang=lang_code)
            print(f"[OmniParse] PaddleOCR lang='{lang_code}' initialized successfully.")
        except Exception as e:
            print(f"[OmniParse] PaddleOCR lang='{lang_code}' init failed ({e}). Falling back to 'en'.")
            traceback.print_exc()
            if "en" in _ocr_engines:
                return _ocr_engines["en"]
            return None

    return _ocr_engines.get(lang_code)


# Initialize default 'en' engine on startup
try:
    get_ocr_engine("en")
except Exception:
    pass


# ── Helper: OCR an image via PaddleOCR ───────────────────────
def ocr_image_paddle(img: Image.Image, lang: str = "en") -> list[str]:
    """Run PaddleOCR on a PIL Image with specified language, return list of text lines."""
    engine = get_ocr_engine(lang)
    if engine is None:
        return []
    import numpy as np
    img_array = np.array(img.convert("RGB"))
    lines: list[str] = []
    try:
        result = engine.ocr(img_array)
        if result and len(result) > 0:
            for res_item in result:
                if not res_item:
                    continue
                if isinstance(res_item, list):
                    for line_info in res_item:
                        if isinstance(line_info, (list, tuple)) and len(line_info) >= 2:
                            text = line_info[1][0] if isinstance(line_info[1], (list, tuple)) else str(line_info[1])
                            if text.strip():
                                lines.append(text.strip())
                elif isinstance(res_item, dict) and "rec_text" in res_item:
                    rec_texts = res_item.get("rec_text", [])
                    for t in rec_texts:
                        if str(t).strip():
                            lines.append(str(t).strip())
    except Exception as e:
        print(f"[OmniParse] PaddleOCR execution note: {e}")
    return lines


# ── Page Image Renderers ─────────────────────────────────────
def render_pdf_to_page_images(file_bytes: bytes) -> list[str]:
    page_images: list[str] = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            page_images.append(f"data:image/png;base64,{b64}")
        doc.close()
    except Exception as e:
        print("Error rendering PDF pages to images:", e)
    return page_images


def render_pptx_to_page_images(file_bytes: bytes) -> list[str]:
    if not HAS_COM:
        return []
    page_images: list[str] = []
    try:
        pythoncom.CoInitialize()
        with tempfile.TemporaryDirectory() as tmpdir:
            pptx_path = os.path.join(tmpdir, "doc.pptx")
            out_dir = os.path.join(tmpdir, "slides")
            os.makedirs(out_dir, exist_ok=True)

            with open(pptx_path, "wb") as f:
                f.write(file_bytes)

            ppt_app = win32com.client.Dispatch("PowerPoint.Application")
            try:
                presentation = ppt_app.Presentations.Open(
                    FileName=pptx_path,
                    ReadOnly=True,
                    Untitled=False,
                    WithWindow=False
                )
                presentation.SaveAs(out_dir, 17)  # 17 = ppSaveAsPNG
                presentation.Close()
            finally:
                try:
                    ppt_app.Quit()
                except Exception:
                    pass

            if os.path.exists(out_dir):
                png_files = sorted(
                    [f for f in os.listdir(out_dir) if f.lower().endswith(".png")],
                    key=lambda x: int(''.join(filter(str.isdigit, x)) or 0)
                )
                for fname in png_files:
                    fpath = os.path.join(out_dir, fname)
                    with open(fpath, "rb") as img_f:
                        b64 = base64.b64encode(img_f.read()).decode("utf-8")
                        page_images.append(f"data:image/png;base64,{b64}")
    except Exception as e:
        print("Error rendering PPTX slides to images via PowerPoint COM:", e)
    finally:
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass
    return page_images


def render_docx_to_page_images(file_bytes: bytes) -> list[str]:
    if not HAS_COM:
        return []
    page_images: list[str] = []
    try:
        pythoncom.CoInitialize()
        with tempfile.TemporaryDirectory() as tmpdir:
            docx_path = os.path.join(tmpdir, "doc.docx")
            pdf_path = os.path.join(tmpdir, "doc.pdf")

            with open(docx_path, "wb") as f:
                f.write(file_bytes)

            word_app = win32com.client.Dispatch("Word.Application")
            word_app.Visible = False
            try:
                doc = word_app.Documents.Open(docx_path, ReadOnly=True)
                doc.SaveAs(pdf_path, FileFormat=17)  # 17 = wdFormatPDF
                doc.Close()
            finally:
                try:
                    word_app.Quit()
                except Exception:
                    pass

            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as pdf_f:
                    page_images = render_pdf_to_page_images(pdf_f.read())
    except Exception as e:
        print("Error rendering DOCX pages to images via Word COM:", e)
    finally:
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass
    return page_images


# ── PDF Extractor ────────────────────────────────────────────
def extract_pdf(file_bytes: bytes, lang: str = "en"):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    all_lines: list[str] = []
    extracted_images: list[dict] = []
    img_count = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_lines: list[str] = []

        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        page_lines = ocr_image_paddle(img, lang=lang)

        if not page_lines:
            text = page.get_text("text").strip()
            page_lines = [l.strip() for l in text.splitlines() if l.strip()]

        all_lines.append(f"Page {page_num + 1}")
        if page_lines:
            all_lines.extend(page_lines)
        else:
            all_lines.append("[No text detected on this page]")

        for img_idx, img_info in enumerate(page.get_images(full=True)):
            try:
                xref = img_info[0]
                base_img = doc.extract_image(xref)
                img_bytes = base_img["image"]
                ext = base_img.get("ext", "png")
                w = base_img.get("width", 800)
                h = base_img.get("height", 600)
                b64 = base64.b64encode(img_bytes).decode("utf-8")
                img_count += 1
                extracted_images.append({
                    "id": f"img-pdf-{img_count}",
                    "label": f"Page {page_num + 1} Figure {img_idx + 1}",
                    "width": w,
                    "height": h,
                    "format": ext.upper(),
                    "url": f"data:image/{ext};base64,{b64}",
                    "size": f"{round(len(img_bytes) / 1024, 1)} KB",
                })
            except Exception:
                pass

    doc.close()
    page_images = render_pdf_to_page_images(file_bytes)
    return all_lines, extracted_images, page_images


# ── PPTX Extractor ───────────────────────────────────────────
def extract_pptx(file_bytes: bytes, lang: str = "en"):
    prs = Presentation(io.BytesIO(file_bytes))
    all_lines: list[str] = []
    extracted_images: list[dict] = []
    img_count = 0

    for slide_num, slide in enumerate(prs.slides, start=1):
        slide_lines: list[str] = []
        slide_img_idx = 0

        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text = paragraph.text.strip()
                    if text:
                        slide_lines.append(text)
            if shape.has_table:
                table = shape.table
                for row in table.rows:
                    row_text = " | ".join(
                        cell.text.strip() for cell in row.cells if cell.text.strip()
                    )
                    if row_text:
                        slide_lines.append(row_text)

            if hasattr(shape, "image"):
                try:
                    img_bytes = shape.image.blob
                    ext = shape.image.ext
                    content_type = shape.image.content_type
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    img_count += 1
                    slide_img_idx += 1

                    with Image.open(io.BytesIO(img_bytes)) as pil_img:
                        w, h = pil_img.size

                    extracted_images.append({
                        "id": f"img-pptx-{img_count}",
                        "label": f"Slide {slide_num} Image {slide_img_idx}",
                        "width": w,
                        "height": h,
                        "format": ext.upper(),
                        "url": f"data:{content_type};base64,{b64}",
                        "size": f"{round(len(img_bytes) / 1024, 1)} KB",
                    })
                except Exception as ex:
                    print("Error extracting PPTX shape image:", ex)

        all_lines.append(f"Slide {slide_num}")
        if slide_lines:
            all_lines.extend(slide_lines)
        else:
            all_lines.append("[Image-only slide — no extractable text]")

    if not extracted_images:
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                zip_img_idx = 0
                for filename in z.namelist():
                    if filename.startswith("ppt/media/"):
                        img_bytes = z.read(filename)
                        ext = filename.split(".")[-1].lower()
                        if ext in ["png", "jpg", "jpeg", "webp", "gif", "bmp"]:
                            b64 = base64.b64encode(img_bytes).decode("utf-8")
                            zip_img_idx += 1
                            with Image.open(io.BytesIO(img_bytes)) as pil_img:
                                w, h = pil_img.size
                            extracted_images.append({
                                "id": f"img-pptx-zip-{zip_img_idx}",
                                "label": f"Media {filename.split('/')[-1]}",
                                "width": w,
                                "height": h,
                                "format": ext.upper(),
                                "url": f"data:image/{ext};base64,{b64}",
                                "size": f"{round(len(img_bytes) / 1024, 1)} KB",
                            })
        except Exception:
            pass

    page_images = render_pptx_to_page_images(file_bytes)
    return all_lines, extracted_images, page_images


# ── DOCX Extractor ───────────────────────────────────────────
def extract_docx(file_bytes: bytes, lang: str = "en"):
    doc = DocxDocument(io.BytesIO(file_bytes))
    lines: list[str] = []
    extracted_images: list[dict] = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)

    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(
                cell.text.strip() for cell in row.cells if cell.text.strip()
            )
            if row_text:
                lines.append(row_text)

    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            img_idx = 0
            for filename in z.namelist():
                if filename.startswith("word/media/"):
                    img_bytes = z.read(filename)
                    ext = filename.split(".")[-1].lower()
                    if ext in ["png", "jpg", "jpeg", "webp", "gif", "bmp"]:
                        b64 = base64.b64encode(img_bytes).decode("utf-8")
                        img_idx += 1
                        with Image.open(io.BytesIO(img_bytes)) as pil_img:
                            w, h = pil_img.size
                        extracted_images.append({
                            "id": f"img-docx-{img_idx}",
                            "label": f"Image {img_idx} ({filename.split('/')[-1]})",
                            "width": w,
                            "height": h,
                            "format": ext.upper(),
                            "url": f"data:image/{ext};base64,{b64}",
                            "size": f"{round(len(img_bytes) / 1024, 1)} KB",
                        })
    except Exception:
        pass

    page_images = render_docx_to_page_images(file_bytes)
    return lines, extracted_images, page_images


# ── Text File Extractor ──────────────────────────────────────
def extract_text_file(file_bytes: bytes):
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1")
    return [line.strip() for line in text.splitlines() if line.strip()], [], []


# ── Standalone Image Extractor ───────────────────────────────
def extract_image(file_bytes: bytes, filename: str, lang: str = "en"):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    lines = ocr_image_paddle(img, lang=lang)
    w, h = img.size
    ext = filename.split(".")[-1].lower() if "." in filename else "png"
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:image/{ext};base64,{b64}"

    single_img = [{
        "id": "img-standalone-1",
        "label": f"Uploaded Image ({filename})",
        "width": w,
        "height": h,
        "format": ext.upper(),
        "url": data_url,
        "size": f"{round(len(file_bytes) / 1024, 1)} KB",
    }]

    return lines if lines else ["[No text detected in image]"], single_img, [data_url]


# ── Main Extraction Endpoint ────────────────────────────────
@app.post("/v1/vision/analyze")
@app.post("/api/v1/extract")
async def analyze_document(
    file: UploadFile = File(...),
    ocr_lang: str = Form("en"),
    translate_to: str = Form(None)
):
    """
    Multilingual document & image extraction endpoint powered by PaddleOCR (EN, JP, DE, FR, ES, CH, HI).
    Returns extracted text lines, embedded images, AND high-resolution slide/page images!
    Optionally translates extracted text to target language (e.g. 'en', 'de', 'ja').
    """
    filename = (file.filename or "unknown").lower()
    file_bytes = await file.read()

    print(f"[OmniParse] Processing: {file.filename} ({len(file_bytes)} bytes) | OCR Lang: '{ocr_lang}'")

    try:
        extracted_lines: list[str] = []
        extracted_images: list[dict] = []
        page_images: list[str] = []

        if filename.endswith(".pdf"):
            extracted_lines, extracted_images, page_images = extract_pdf(file_bytes, lang=ocr_lang)

        elif filename.endswith((".pptx", ".ppt")):
            extracted_lines, extracted_images, page_images = extract_pptx(file_bytes, lang=ocr_lang)

        elif filename.endswith((".docx", ".doc")):
            extracted_lines, extracted_images, page_images = extract_docx(file_bytes, lang=ocr_lang)

        elif filename.endswith((".txt", ".csv", ".json", ".md")):
            extracted_lines, extracted_images, page_images = extract_text_file(file_bytes)

        elif filename.endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff")):
            extracted_lines, extracted_images, page_images = extract_image(file_bytes, file.filename, lang=ocr_lang)

        else:
            try:
                extracted_lines, extracted_images, page_images = extract_image(file_bytes, file.filename, lang=ocr_lang)
            except Exception:
                extracted_lines, extracted_images, page_images = extract_text_file(file_bytes)

        # Optional Auto-Translation
        translated_lines: list[str] = []
        if translate_to and translate_to.strip():
            target_lang = translate_to.strip().lower()
            if target_lang in ["jp", "japan", "japanese"]:
                target_lang = "ja"
            elif target_lang in ["de", "german"]:
                target_lang = "de"

            print(f"[OmniParse] Translating {len(extracted_lines)} lines to '{target_lang}'...")
            try:
                translator = GoogleTranslator(source="auto", target=target_lang)
                for line in extracted_lines:
                    if not line.strip() or line.startswith(("Page ", "Slide ", "[No text")):
                        translated_lines.append(line)
                    else:
                        try:
                            translated_lines.append(translator.translate(line.strip()))
                        except Exception:
                            translated_lines.append(line)
            except Exception as trans_err:
                print("Translation error:", trans_err)

        return {
            "api_version": "2.3.0",
            "status": "success",
            "payload": {
                "extracted_text": extracted_lines,
                "translated_text": translated_lines if translated_lines else None,
                "ocr_language": ocr_lang,
                "extracted_images": extracted_images,
                "page_images": page_images,
                "source_file": file.filename,
                "total_lines": len(extracted_lines),
                "total_images": len(extracted_images),
                "total_pages": len(page_images),
            },
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Document processing error: {str(e)}",
        )


# ── Translation Schema & Endpoint ────────────────────────────
class TranslationRequest(BaseModel):
    lines: list[str]
    target_lang: str = "en"
    source_lang: str = "auto"


@app.post("/v1/vision/translate")
async def translate_text_endpoint(req: TranslationRequest):
    """
    Standalone text line translation endpoint using Deep Translator (Google Translate engine).
    Supports translating to English ('en'), German ('de'), Japanese ('ja'), French ('fr'), Spanish ('es'), Chinese ('zh-CN'), etc.
    """
    if not req.lines:
        return {"status": "success", "translated_lines": []}

    target = req.target_lang.lower().strip()
    if target in ["jp", "japan", "japanese"]:
        target = "ja"
    elif target in ["de", "german"]:
        target = "de"
    elif target in ["ch", "chinese", "zh"]:
        target = "zh-CN"

    print(f"[OmniParse] Translating {len(req.lines)} lines to '{target}'...")
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


# ── Real-time Tech Trends Endpoint ───────────────────────────
def strip_emojis(text: str) -> str:
    """Remove all emojis, symbols, and non-printable unicode characters."""
    clean = re.sub(r'[\U00010000-\U0010ffff\u2600-\u27ff\u2b00-\u2bff\u2300-\u23ff\u2000-\u206F]', '', text)
    clean = re.sub(r'[^\x00-\x7F]+', ' ', clean)
    return ' '.join(clean.split())


@app.get("/v1/trends")
async def get_tech_trends():
    """
    Real-time Tech Trends Feed (HackerNews & Dev.to) — No emojis, clean SF/Bangalore tech corporate quotes & headlines.
    """
    trends = []

    # 1. Fetch HackerNews top tech stories
    try:
        req = urllib.request.Request('https://hacker-news.firebaseio.com/v0/topstories.json', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            story_ids = json.loads(resp.read())[:8]

        for s_id in story_ids[:5]:
            try:
                item_req = urllib.request.Request(f'https://hacker-news.firebaseio.com/v0/item/{s_id}.json', headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(item_req, timeout=2) as item_resp:
                    item = json.loads(item_resp.read())
                    title = strip_emojis(item.get('title', ''))
                    if title and len(title) > 5:
                        if len(title) > 65:
                            title = title[:62] + '...'
                        trends.append(title)
            except Exception:
                pass
    except Exception as e:
        print("[OmniParse] HN Trends fetch notice:", e)

    # 2. Fetch Dev.to trending tech articles
    if len(trends) < 5:
        try:
            req = urllib.request.Request('https://dev.to/api/articles?per_page=6', headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as resp:
                articles = json.loads(resp.read())
                for art in articles:
                    title = strip_emojis(art.get('title', ''))
                    if title and len(title) > 5:
                        if len(title) > 65:
                            title = title[:62] + '...'
                        trends.append(title)
        except Exception as dev_err:
            print("[OmniParse] Dev.to Trends fetch notice:", dev_err)

    cleaned_trends = [strip_emojis(t) for t in trends if t.strip()]

    # Fallback corporate quotes if offline (NO EMOJIS)
    if not cleaned_trends:
        cleaned_trends = [
            "Let us ship to production before sprint review",
            "0 to 1 scaling and high leverage engineering",
            "Main character energy in sprint planning",
            "Building in public with zero tech debt",
            "Disruption speedrun from SF to Bangalore"
        ]

    # Select 1 quote deterministically for the current 6-hour time window
    import time
    six_hour_block = int(time.time() // (6 * 3600))
    featured_quote = cleaned_trends[six_hour_block % len(cleaned_trends)]

    return {
        "status": "success",
        "quote": featured_quote,
        "trends": cleaned_trends[:6]
    }


# ── Health check ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "ocr_engine": f"Multilingual PaddleOCR v3.7 ({', '.join(_ocr_engines.keys())})",
        "com_renderer": "PowerPoint & Word COM Active" if HAS_COM else "Disabled",
        "translator": "Deep Translator Active",
        "trends_feed": "Active",
        "version": "2.3.0",
    }
