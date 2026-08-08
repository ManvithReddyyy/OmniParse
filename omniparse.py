#!/usr/bin/env python3
"""
OmniParse CLI — Universal Document OCR & Translation Command-Line Interface (Claude Code / OpenAI Style)

Usage:
  omniparse [input_file] [stdout|output_path] [-l lang] [-t target_lang] [-f format]

Interactive Mode:
  omniparse  (without arguments)
"""

import sys
import os
import time
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

# Optional Rich UI Support
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.syntax import Syntax
    from rich.text import Text
    from rich.prompt import Prompt
    from rich.markdown import Markdown
    from rich import print as rprint
    HAS_RICH = True
    console = Console()
except ImportError:
    HAS_RICH = False
    console = None

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

LANG_LABELS = {
    "en": "English",
    "japan": "Japanese (日本語)",
    "german": "German (Deutsch)",
    "french": "French (Français)",
    "es": "Spanish (Español)",
    "ch": "Chinese (中文)",
    "hi": "Hindi (हिन्दी)",
}

def print_banner():
    if HAS_RICH:
        banner = Panel(
            "[bold white]OmniParse CLI[/bold white] [dim]v0.1.0-beta[/dim]\n"
            "[bold #818CF8]Universal IDP & Multilingual OCR Platform[/bold #818CF8]\n"
            "[dim]Powered by PaddleOCR v3.7 • PyMuPDF • Deep Translator[/dim]",
            border_style="#818CF8",
            expand=False,
            padding=(0, 2),
        )
        console.print(banner)
    else:
        print("=" * 60)
        print("   OmniParse CLI v0.1.0-beta • Universal IDP & Multilingual OCR")
        print("=" * 60)

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

def process_document(input_path, ocr_lang="en", target_lang=None, backend_url=DEFAULT_BACKEND_URL):
    start_time = time.time()

    if not os.path.exists(input_path):
        if HAS_RICH:
            console.print(f"[bold red]✖ Error:[/bold red] File not found: '{input_path}'")
        else:
            print(f"Error: File not found '{input_path}'", file=sys.stderr)
        return None, 0

    with open(input_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(input_path)
    content_type, body = create_multipart_formdata(
        {"ocr_lang": ocr_lang},
        [("file", filename, file_bytes)],
    )

    req = urllib.request.Request(
        f"{backend_url.rstrip('/')}/v1/vision/analyze",
        data=body,
        headers={"Content-Type": content_type},
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        if HAS_RICH:
            console.print(f"[bold red]✖ Error during extraction:[/bold red] {e}")
        else:
            print(f"Error during extraction: {e}", file=sys.stderr)
        return None, 0

    extracted_lines = res_data.get("payload", {}).get("extracted_text", [])

    # Handle Translation if requested
    if target_lang and extracted_lines:
        trans_body = json.dumps({"lines": extracted_lines, "target_lang": target_lang}).encode("utf-8")
        trans_req = urllib.request.Request(
            f"{backend_url.rstrip('/')}/v1/vision/translate",
            data=trans_body,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(trans_req, timeout=60) as trans_resp:
                trans_data = json.loads(trans_resp.read().decode("utf-8"))
                extracted_lines = trans_data.get("translated_lines", extracted_lines)
        except Exception as e:
            if HAS_RICH:
                console.print(f"[yellow]⚠ Translation warning:[/yellow] {e}")

    elapsed = round(time.time() - start_time, 2)
    return extracted_lines, elapsed

def interactive_mode(backend_url=DEFAULT_BACKEND_URL):
    print_banner()

    current_lang = "en"
    target_lang = None
    output_format = "txt"

    if HAS_RICH:
        console.print("\n[bold cyan]Interactive Terminal Mode[/bold cyan] [dim](Type slash commands or drag-and-drop a file)[/dim]")
        console.print("  [bold #818CF8]/lang <code>[/bold #818CF8]      - Set OCR language (en, japan, german, french, es, ch, hi)")
        console.print("  [bold #818CF8]/translate <code>[/bold #818CF8] - Set target translation language")
        console.print("  [bold #818CF8]/format <txt|md|json>[/bold #818CF8] - Set output format")
        console.print("  [bold #818CF8]/status[/bold #818CF8]          - Check backend server status")
        console.print("  [bold #818CF8]/help[/bold #818CF8]            - Show help & supported languages")
        console.print("  [bold #818CF8]/exit[/bold #818CF8]            - Exit interactive shell\n")
    else:
        print("\nInteractive Terminal Mode. Type slash commands (/help, /exit) or a file path to process.\n")

    while True:
        try:
            prompt_str = f"omniparse ({current_lang}" + (f" ➔ {target_lang}" if target_lang else "") + ") > "
            if HAS_RICH:
                cmd = console.input(f"[bold #818CF8]{prompt_str}[/bold #818CF8]").strip()
            else:
                cmd = input(prompt_str).strip()

            if not cmd:
                continue

            # Strip outer quotes if dragged-and-dropped
            if (cmd.startswith('"') and cmd.endswith('"')) or (cmd.startswith("'") and cmd.endswith("'")):
                cmd = cmd[1:-1]

            if cmd in ["/exit", "/quit", "exit", "quit"]:
                if HAS_RICH:
                    console.print("[dim]Goodbye![/dim]")
                break

            elif cmd in ["/help", "help"]:
                print_banner()
                if HAS_RICH:
                    table = Table(title="Supported OCR & Translation Languages", border_style="#818CF8")
                    table.add_column("Code", style="cyan")
                    table.add_column("Language", style="bold white")
                    for code, label in LANG_LABELS.items():
                        table.add_row(code, label)
                    console.print(table)
                continue

            elif cmd == "/status":
                try:
                    req = urllib.request.Request(f"{backend_url.rstrip('/')}/health")
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        if HAS_RICH:
                            console.print(f"[bold green]✔ Backend Connected:[/bold green] {data.get('ocr_engine')}")
                        else:
                            print(f"Backend Connected: {data}")
                except Exception as e:
                    if HAS_RICH:
                        console.print(f"[bold red]✖ Backend Offline:[/bold red] {e}")
                    else:
                        print(f"Backend Offline: {e}")
                continue

            elif cmd.startswith("/lang"):
                parts = cmd.split(maxsplit=1)
                if len(parts) > 1:
                    new_l = LANG_MAP.get(parts[1].lower(), parts[1].lower())
                    current_lang = new_l
                    if HAS_RICH:
                        console.print(f"[bold green]✔ OCR Language set to:[/bold green] [bold cyan]{LANG_LABELS.get(current_lang, current_lang)}[/bold cyan]")
                else:
                    console.print(f"Current OCR Language: [cyan]{current_lang}[/cyan]")
                continue

            elif cmd.startswith("/translate"):
                parts = cmd.split(maxsplit=1)
                if len(parts) > 1:
                    if parts[1].lower() in ["none", "off", "clear"]:
                        target_lang = None
                        if HAS_RICH:
                            console.print("[bold yellow]✔ Translation disabled[/bold yellow]")
                    else:
                        target_lang = LANG_MAP.get(parts[1].lower(), parts[1].lower())
                        if HAS_RICH:
                            console.print(f"[bold green]✔ Translation target set to:[/bold green] [bold cyan]{target_lang}[/cyan]")
                else:
                    console.print(f"Target Translation: [cyan]{target_lang or 'None'}[/cyan]")
                continue

            elif cmd.startswith("/format"):
                parts = cmd.split(maxsplit=1)
                if len(parts) > 1 and parts[1].lower() in ["txt", "md", "markdown", "json"]:
                    output_format = parts[1].lower()
                    if HAS_RICH:
                        console.print(f"[bold green]✔ Output format set to:[/bold green] [bold cyan]{output_format}[/bold cyan]")
                continue

            # Process document file path
            if os.path.exists(cmd):
                if HAS_RICH:
                    with console.status(f"[bold cyan]⠋ Processing {os.path.basename(cmd)} via PaddleOCR ({current_lang})...[/bold cyan]"):
                        lines, elapsed = process_document(cmd, ocr_lang=current_lang, target_lang=target_lang, backend_url=backend_url)
                else:
                    print(f"Processing {cmd}...")
                    lines, elapsed = process_document(cmd, ocr_lang=current_lang, target_lang=target_lang, backend_url=backend_url)

                if lines is not None:
                    if output_format in ["markdown", "md"]:
                        output_str = "# Extracted Document Text\n\n" + "\n\n".join(lines)
                    elif output_format == "json":
                        output_str = json.dumps({"file": os.path.basename(cmd), "ocr_lang": current_lang, "lines": lines}, indent=2)
                    else:
                        output_str = "\n".join(lines)

                    if HAS_RICH:
                        title_str = f"Extracted Result ({len(lines)} lines • {elapsed}s)"
                        panel = Panel(output_str, title=f"[bold #34D399]✔ {title_str}[/bold #34D399]", border_style="#34D399", padding=(1, 2))
                        console.print(panel)
                    else:
                        print(f"\n--- Extracted Result ({len(lines)} lines, {elapsed}s) ---")
                        print(output_str)
                        print("-" * 50)
            else:
                if HAS_RICH:
                    console.print(f"[bold red]✖ Unknown command or file not found:[/bold red] '{cmd}'")
                else:
                    print(f"Unknown command or file not found: '{cmd}'")

        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as err:
            if HAS_RICH:
                console.print(f"[bold red]✖ Error:[/bold red] {err}")
            else:
                print(f"Error: {err}")

def main():
    parser = argparse.ArgumentParser(
        prog="omniparse",
        description="OmniParse Command Line OCR & Translation Interface (Claude Code / OpenAI Style)",
    )

    parser.add_argument("input_file", nargs="?", default=None, help="Path to input document (PDF, PPTX, DOCX, PNG, JPG, WEBP)")
    parser.add_argument("output", nargs="?", default="stdout", help="Output destination ('stdout' or file path)")
    parser.add_argument("-l", "--lang", default="en", help="OCR language (eng, jpn, ger, fre, spa, chi, hin)")
    parser.add_argument("-t", "--translate", default=None, help="Target language to translate extracted text into (en, de, ja, fr, es, zh)")
    parser.add_argument("-f", "--format", choices=["txt", "markdown", "md", "json"], default="txt", help="Output format (txt, markdown, json)")
    parser.add_argument("-i", "--interactive", action="store_true", help="Launch interactive terminal REPL mode")
    parser.add_argument("--backend", default=DEFAULT_BACKEND_URL, help="OmniParse backend server URL")
    parser.add_argument("--list-langs", action="store_true", help="List supported OCR & translation languages")

    args = parser.parse_args()

    if args.list_langs:
        print_banner()
        if HAS_RICH:
            table = Table(title="Supported OmniParse OCR Languages", border_style="#818CF8")
            table.add_column("Code / Aliases", style="cyan")
            table.add_column("Language Name", style="bold white")
            for code, label in LANG_LABELS.items():
                table.add_row(code, label)
            console.print(table)
        else:
            print("Supported OmniParse OCR Languages:")
            for code, label in LANG_LABELS.items():
                print(f"  - {code}: {label}")
        sys.exit(0)

    # Launch interactive mode if explicitly requested or if no arguments provided
    if args.interactive or not args.input_file:
        interactive_mode(backend_url=args.backend)
        sys.exit(0)

    ocr_lang = LANG_MAP.get(args.lang.lower(), args.lang)

    # Check health of backend
    try:
        req = urllib.request.Request(f"{args.backend.rstrip('/')}/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            pass
    except Exception:
        if HAS_RICH:
            console.print(f"[bold red]✖ Could not connect to OmniParse backend server at {args.backend}[/bold red]")
            console.print("[dim]Make sure backend server is running with 'python -m uvicorn app:app --port 7860'[/dim]")
        else:
            print(f"Error: Could not connect to OmniParse backend server at {args.backend}", file=sys.stderr)
        sys.exit(1)

    if HAS_RICH and args.output in ["stdout", "-"]:
        with console.status(f"[bold cyan]⠋ Analyzing {os.path.basename(args.input_file)} via PaddleOCR ({ocr_lang})...[/bold cyan]"):
            lines, elapsed = process_document(args.input_file, ocr_lang=ocr_lang, target_lang=args.translate, backend_url=args.backend)
    else:
        lines, elapsed = process_document(args.input_file, ocr_lang=ocr_lang, target_lang=args.translate, backend_url=args.backend)

    if lines is None:
        sys.exit(1)

    # Format output
    fmt = args.format.lower()
    if fmt in ["markdown", "md"]:
        output_text = "# Extracted Document Text\n\n" + "\n\n".join(lines)
    elif fmt == "json":
        output_text = json.dumps(
            {
                "file": os.path.basename(args.input_file),
                "ocr_language": ocr_lang,
                "translated_to": args.translate,
                "lines_count": len(lines),
                "execution_seconds": elapsed,
                "extracted_text": lines,
            },
            indent=2,
        )
    else:
        output_text = "\n".join(lines)

    # Output to stdout or file
    if args.output in ["stdout", "-"]:
        if HAS_RICH:
            title_str = f"Extracted Result ({len(lines)} lines • {elapsed}s)"
            panel = Panel(output_text, title=f"[bold #34D399]✔ {title_str}[/bold #34D399]", border_style="#34D399", padding=(1, 2))
            console.print(panel)
        else:
            print(output_text)
    else:
        with open(args.output, "w", encoding="utf-8") as out_f:
            out_f.write(output_text)
        if HAS_RICH:
            console.print(f"[bold green]✔ Successfully extracted OCR text from '{os.path.basename(args.input_file)}' ➔ '{args.output}' ({elapsed}s)[/bold green]")
        else:
            print(f"Successfully extracted OCR text from '{os.path.basename(args.input_file)}' -> '{args.output}' ({elapsed}s)")

if __name__ == "__main__":
    main()
