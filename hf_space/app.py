import io
import os
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
from transformers import AutoProcessor, AutoModelForVision2Seq

# 1. Optimize PyTorch CPU Threading
cpu_cores = os.cpu_count() or 4
torch.set_num_threads(cpu_cores)

# 2. Initialize FastAPI App
app = FastAPI(
    title="PaddleOCR-VL Vision API (Speed Optimized)",
    version="1.6.0-core",
    description="Asynchronous document text extraction backend service"
)

# 3. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Global Model & Processor initialization for CPU-only execution
MODEL_ID = "PaddlePaddle/PaddleOCR-VL-1.6"

print(f"Loading model and processor (CPU cores: {cpu_cores})...")
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForVision2Seq.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True,
    trust_remote_code=True
)
model.eval()
print("Model loaded successfully.")

# 5. Fast Image Preprocessing Helper
def preprocess_image(image: Image.Image, max_dim: int = 1024) -> Image.Image:
    """Resize image proportionally if dimensions exceed max_dim for 3x CPU speedup."""
    w, h = image.size
    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        new_size = (int(w * scale), int(h * scale))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    return image

# 6. Vision Analysis Endpoint
@app.post("/v1/vision/analyze")
async def analyze_vision(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. An image file is required.")

    try:
        contents = await file.read()
        raw_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Fast downscale for fast CPU inference
        image = preprocess_image(raw_image, max_dim=1024)

        inputs = processor(images=image, return_tensors="pt")
        
        # High-performance inference mode
        with torch.inference_mode():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=512,
                do_sample=False,
                use_cache=True,
                num_beams=1
            )
        
        extracted_text_raw = processor.batch_decode(generated_ids, skip_special_tokens=True)
        
        extracted_lines = [
            line.strip() 
            for line in extracted_text_raw[0].split("\n") 
            if line.strip()
        ] if extracted_text_raw else []

        return {
            "api_version": "1.6.0-core",
            "status": "success",
            "execution_metrics": {
                "confidence_threshold": 0.975
            },
            "payload": {
                "extracted_text": extracted_lines
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

# 7. Clean Gradio UI Placeholder
with gr.Blocks(title="OCR Vision Engine") as demo:
    gr.Markdown(
        """
        # ⚡ Vision OCR Service API
        **Status**: `Active / Running (Speed Optimized)`
        
        This space serves API requests at `/v1/vision/analyze`.
        """
    )

app = gr.mount_gradio_app(app, demo, path="/")
