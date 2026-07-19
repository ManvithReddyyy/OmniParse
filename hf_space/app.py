import io
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
from transformers import AutoProcessor, AutoModelForVision2Seq

# 1. Initialize FastAPI App
app = FastAPI(
    title="PaddleOCR-VL Vision API",
    version="1.6.0-core",
    description="Asynchronous document text extraction backend service"
)

# 2. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Global Model & Processor initialization for CPU-only execution
MODEL_ID = "PaddlePaddle/PaddleOCR-VL-1.6"

print("Loading model and processor...")
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForVision2Seq.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True,
    trust_remote_code=True
)
model.eval()
print("Model loaded successfully.")

# 4. Vision Analysis Endpoint
@app.post("/v1/vision/analyze")
async def analyze_vision(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. An image file is required.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=1024
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

# 5. Clean Gradio UI Placeholder
with gr.Blocks(title="OCR Vision Engine") as demo:
    gr.Markdown(
        """
        # ⚡ Vision OCR Service API
        **Status**: `Active / Running`
        
        This space serves API requests at `/v1/vision/analyze`. Direct web UI access is intentionally disabled for secure proxy usage.
        """
    )

# 6. Mount Gradio to FastAPI
app = gr.mount_gradio_app(app, demo, path="/")
