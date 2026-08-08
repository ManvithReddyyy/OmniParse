#!/usr/bin/env python3
"""
OmniParse CLI — Universal Document OCR & Translation Command-Line Interface (Tesseract-compatible interface)

Usage:
  python omniparse.py <input_file> [stdout|output_path] [-l lang] [-t target_lang] [-f format]

Examples:
  python omniparse.py document.pdf stdout -l en
  python omniparse.py slide.pptx output.md -l japan --translate en
  python omniparse.py invoice.png output.json -f json -l german
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.parse

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DEFAULT_BACKEND_URL = os.environ.get("OMNIPARSE_URL", "http://localhost:7860")

LANG_MAP = {
    "eng": "en",
    "en": "en",
    "jpn": "japan",
    "ja": "japan",
    "japan": "japan",
    "japanese": "japan",
    "ger": "german",
    "de": "german",
    "german": "german",
    "fre": "french",
    "fr": "french",
    "french": "french",
    "spa": "es",
    "es": "es",
    "spanish": "es",
    "chi": "ch",
    "ch": "ch",
    "chinese": "ch",
    "hin": "hi",
    "hi": "hi",
    "hindi": "hi",
}

def create_multipart_formdata(fields, files):
    boundary = "----WebKitFormBoundaryOmniParseCLI"
    body = bytearray()

    for key, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))

    for key, filename, file_data in files:
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(b"Content-Type: application/octet-stream\r\n\r\n")
        body.extend(file_data)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return content_type, bytes(body)

def main():
    parser = argparse.ArgumentParser(
        prog="omniparse",
        description="OmniParse Command Line OCR & Translation Interface (Tesseract compatible)",
    )

    parser.add_argument("input_file", nargs="?", help="Path to input document (PDF, PPTX, DOCX, PNG, JPG, WEBP)")
    parser.add_argument("output", nargs="?", default="stdout", help="Output destination ('stdout' or file path)")
    parser.add_argument("-l", "--lang", default="en", help="OCR language (eng, jpn, ger, fre, spa, chi, hin)")
    parser.add_argument("-t", "--translate", default=None, help="Target language to translate extracted text into (en, de, ja, fr, es, zh)")
    parser.add_argument("-f", "--format", choices=["txt", "markdown", "md", "json"], default="txt", help="Output format (txt, markdown, json)")
    parser.add_argument("--backend", default=DEFAULT_BACKEND_URL, help="OmniParse backend server URL")
    parser.add_argument("--list-langs", action="store_true", help="List supported OCR & translation languages")

    args = parser.parse_args()

    if args.list_langs:
        print("Supported OmniParse OCR Languages:")
        print("  - eng / en     : English")
        print("  - jpn / japan  : Japanese (日本語)")
        print("  - ger / german : German (Deutsch)")
        print("  - fre / french : French (Français)")
        print("  - spa / es     : Spanish (Español)")
        print("  - chi / ch     : Chinese (中文)")
        print("  - hin / hi     : Hindi (हिन्दी)")
        sys.exit(0)

    if not args.input_file:
        parser.print_help()
        sys.exit(1)

    if not os.path.exists(args.input_file):
        print(f"Error: Input file '{args.input_file}' does not exist.", file=sys.stderr)
        sys.exit(1)

    ocr_lang = LANG_MAP.get(args.lang.lower(), args.lang)
    backend_url = args.backend.rstrip("/")

    # Check health of backend
    try:
        req = urllib.request.Request(f"{backend_url}/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            pass
    except Exception:
        print(f"Error: Could not connect to OmniParse backend server at {backend_url}", file=sys.stderr)
        print("Make sure the backend server is running with 'python -m uvicorn app:app --port 7860'", file=sys.stderr)
        sys.exit(1)

    # Read input file
    with open(args.input_file, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(args.input_file)
    content_type, body = create_multipart_formdata(
        {"ocr_lang": ocr_lang},
        [("file", filename, file_bytes)],
    )

    req = urllib.request.Request(
        f"{backend_url}/v1/vision/analyze",
        data=body,
        headers={"Content-Type": content_type},
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error during OCR extraction: {e}", file=sys.stderr)
        sys.exit(1)

    extracted_lines = res_data.get("payload", {}).get("extracted_text", [])

    # Handle Translation if requested
    if args.translate and extracted_lines:
        target_lang = LANG_MAP.get(args.translate.lower(), args.translate)
        trans_body = json.dumps({"lines": extracted_lines, "target_lang": target_lang}).encode("utf-8")
        trans_req = urllib.request.Request(
            f"{backend_url}/v1/vision/translate",
            data=trans_body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(trans_req, timeout=60) as trans_resp:
                trans_data = json.loads(trans_resp.read().decode("utf-8"))
                extracted_lines = trans_data.get("translated_lines", extracted_lines)
        except Exception as e:
            print(f"Warning: Translation failed ({e}), using original OCR text.", file=sys.stderr)

    # Format output
    fmt = args.format.lower()
    if fmt in ["markdown", "md"]:
        output_text = "# Extracted Document Text\n\n" + "\n\n".join(extracted_lines)
    elif fmt == "json":
        output_text = json.dumps(
            {
                "file": filename,
                "ocr_language": ocr_lang,
                "translated_to": args.translate,
                "lines_count": len(extracted_lines),
                "extracted_text": extracted_lines,
            },
            indent=2,
        )
    else:
        output_text = "\n".join(extracted_lines)

    # Output to stdout or file
    if args.output in ["stdout", "-"]:
        print(output_text)
    else:
        with open(args.output, "w", encoding="utf-8") as out_f:
            out_f.write(output_text)
        print(f"Successfully extracted OCR text from '{filename}' -> '{args.output}'")

if __name__ == "__main__":
    main()
